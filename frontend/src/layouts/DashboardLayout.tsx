import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <a href="/" className="block px-4 py-2 rounded hover:bg-gray-100">
                Home
              </a>
            </li>
            <li>
              <a href="/users" className="block px-4 py-2 rounded hover:bg-gray-100">
                Users
              </a>
            </li>
            <li>
              <a href="/products" className="block px-4 py-2 rounded hover:bg-gray-100">
                Products
              </a>
            </li>
            <li>
              <a href="/orders" className="block px-4 py-2 rounded hover:bg-gray-100">
                Orders
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
