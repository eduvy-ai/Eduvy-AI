"""
Base repository with common CRUD operations.
All repositories inherit from this.
"""
import json
from typing import Dict, List, Optional, Any
from app.db.connection import get_db, row_to_dict


class BaseRepository:
    """
    Base repository with common CRUD operations.
    Subclasses set `table_name` and optionally override methods.
    """
    table_name: str = ""
    
    # ── CREATE ────────────────────────────────────────────────
    
    def create(self, data: Dict[str, Any]) -> Dict:
        """Insert a new record."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Serialize lists/dicts to JSON
            data = self._serialize(data)
            
            cols = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = list(data.values())
            
            cur.execute(
                f"INSERT INTO {self.table_name} ({cols}) VALUES ({placeholders}) RETURNING *",
                values
            )
            conn.commit()
            return row_to_dict(cur.fetchone())
        finally:
            conn.close()
    
    # ── READ ──────────────────────────────────────────────────
    
    def get_by_id(self, id: str) -> Optional[Dict]:
        """Get a single record by ID."""
        return self.find_one({"id": id})
    
    def find_one(self, filters: Dict[str, Any]) -> Optional[Dict]:
        """Find a single record matching filters."""
        results = self.find(filters, limit=1)
        return results[0] if results else None
    
    def find(
        self,
        filters: Dict[str, Any] = None,
        order_by: str = None,
        order: str = "asc",
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict]:
        """
        Find records with filters.
        
        Supports operators:
            {"field": value}           → field = value
            {"field__ne": value}       → field != value  
            {"field__gt": value}       → field > value
            {"field__gte": value}      → field >= value
            {"field__lt": value}       → field < value
            {"field__lte": value}      → field <= value
            {"field__like": value}     → field ILIKE %value%
            {"field__in": [a,b]}       → field IN (a,b)
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            
            where_clause, values = self._build_where(filters)
            
            query = f"SELECT * FROM {self.table_name}"
            if where_clause:
                query += f" WHERE {where_clause}"
            if order_by:
                query += f" ORDER BY {order_by} {order.upper()}"
            query += f" LIMIT {limit} OFFSET {skip}"
            
            cur.execute(query, values)
            return [row_to_dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    
    def count(self, filters: Dict[str, Any] = None) -> int:
        """Count records matching filters."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            where_clause, values = self._build_where(filters)
            
            query = f"SELECT COUNT(*) as cnt FROM {self.table_name}"
            if where_clause:
                query += f" WHERE {where_clause}"
            
            cur.execute(query, values)
            row = cur.fetchone()
            return row["cnt"] if row else 0
        finally:
            conn.close()
    
    def exists(self, filters: Dict[str, Any]) -> bool:
        """Check if any record matches filters."""
        return self.count(filters) > 0
    
    # ── UPDATE ────────────────────────────────────────────────
    
    def update(self, id: str, data: Dict[str, Any]) -> Optional[Dict]:
        """Update a record by ID."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            data = self._serialize(data)
            
            set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
            values = list(data.values()) + [id]
            
            cur.execute(
                f"UPDATE {self.table_name} SET {set_clause} WHERE id = %s RETURNING *",
                values
            )
            conn.commit()
            return row_to_dict(cur.fetchone())
        finally:
            conn.close()
    
    def increment(self, id: str, field: str, amount: int = 1) -> int:
        """Atomic increment of a numeric field. Returns new value."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {self.table_name} SET {field} = {field} + %s WHERE id = %s RETURNING {field}",
                (amount, id)
            )
            conn.commit()
            row = cur.fetchone()
            return row[field] if row else 0
        finally:
            conn.close()
    
    # ── DELETE ────────────────────────────────────────────────
    
    def delete(self, id: str) -> bool:
        """Delete a record by ID."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {self.table_name} WHERE id = %s", (id,))
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()
    
    def delete_where(self, filters: Dict[str, Any]) -> int:
        """Delete records matching filters. Returns count deleted."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            where_clause, values = self._build_where(filters)
            
            cur.execute(f"DELETE FROM {self.table_name} WHERE {where_clause}", values)
            conn.commit()
            return cur.rowcount
        finally:
            conn.close()
    
    # ── HELPERS ───────────────────────────────────────────────
    
    def _serialize(self, data: Dict) -> Dict:
        """Serialize lists/dicts to JSON strings."""
        result = {}
        for key, value in data.items():
            if isinstance(value, (list, dict)):
                result[key] = json.dumps(value)
            else:
                result[key] = value
        return result
    
    def _build_where(self, filters: Dict[str, Any]) -> tuple[str, list]:
        """Build WHERE clause from filter dict."""
        if not filters:
            return "", []
        
        conditions = []
        values = []
        
        for key, value in filters.items():
            if "__" in key:
                field, op = key.rsplit("__", 1)
            else:
                field, op = key, "eq"
            
            if op == "eq":
                conditions.append(f"{field} = %s")
                values.append(value)
            elif op == "ne":
                conditions.append(f"{field} != %s")
                values.append(value)
            elif op == "gt":
                conditions.append(f"{field} > %s")
                values.append(value)
            elif op == "gte":
                conditions.append(f"{field} >= %s")
                values.append(value)
            elif op == "lt":
                conditions.append(f"{field} < %s")
                values.append(value)
            elif op == "lte":
                conditions.append(f"{field} <= %s")
                values.append(value)
            elif op == "like":
                conditions.append(f"{field} ILIKE %s")
                values.append(f"%{value}%")
            elif op == "in":
                placeholders = ", ".join(["%s"] * len(value))
                conditions.append(f"{field} IN ({placeholders})")
                values.extend(value)
            elif op == "notin":
                placeholders = ", ".join(["%s"] * len(value))
                conditions.append(f"{field} NOT IN ({placeholders})")
                values.extend(value)
            elif op == "isnull":
                if value:
                    conditions.append(f"{field} IS NULL")
                else:
                    conditions.append(f"{field} IS NOT NULL")
        
        return " AND ".join(conditions), values
    
    # ── RAW QUERY ─────────────────────────────────────────────
    
    def raw(self, query: str, params: tuple = None) -> List[Dict]:
        """Execute raw SQL query."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(query, params or ())
            
            if query.strip().upper().startswith("SELECT"):
                return [row_to_dict(row) for row in cur.fetchall()]
            else:
                conn.commit()
                return []
        finally:
            conn.close()
