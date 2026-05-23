---
applyTo: "**/*.tsx"
---

# React + TypeScript + Tailwind Component Guidelines

## Component Structure

```tsx
// Always import React types when needed
import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Module-relative imports first
import { useAuth } from '../hooks';
import { UserResponse } from '../types';

// Shared imports with @ alias
import { Button, Input } from '@/shared/components';
import { useDebounce } from '@/shared/hooks';

interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
  optional?: boolean;
}

export const MyComponent: FC<Props> = ({ title, onSubmit, optional = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
    </div>
  );
};
```

## Tailwind Best Practices

### Spacing & Layout
- Use Tailwind spacing: `p-4`, `m-2`, `gap-4`
- Flexbox: `flex items-center justify-between`
- Grid: `grid grid-cols-3 gap-4`

### Colors
- Use design tokens: `bg-blue-600`, `text-gray-900`
- Hover states: `hover:bg-blue-700`
- Focus states: `focus:ring-2 focus:ring-blue-500`

### Responsive Design
- Mobile-first: `w-full md:w-1/2 lg:w-1/3`
- Hide/show: `hidden md:block`

## Redux Integration

### Using Hooks
```tsx
import { useAuth } from '../hooks';

const Profile: FC = () => {
  const { user, isLoading, logout } = useAuth();
  
  if (isLoading) return <Loader />;
  if (!user) return null;
  
  return <div>{user.name}</div>;
};
```

### Dispatching Actions
```tsx
import { useAppDispatch } from '@/redux/store';
import { login } from '../slice';

const Login: FC = () => {
  const dispatch = useAppDispatch();
  
  const handleSubmit = async (credentials: LoginCredentials) => {
    const result = await dispatch(login(credentials));
    if (result.meta?.requestStatus === 'fulfilled') {
      navigate('/dashboard');
    }
  };
};
```

## Form Handling

```tsx
const [formData, setFormData] = useState({ email: '', password: '' });
const [error, setError] = useState<string | null>(null);

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  try {
    await onSubmit(formData);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
  }
};
```

## Error Boundaries

Always wrap page components in error boundaries. Use Suspense for lazy-loaded components.

## Type Safety

- Define interfaces in `types.ts`
- Use strict TypeScript - no `any` unless absolutely necessary
- Always type function parameters and return values
