import { LoginClient } from './LoginClient';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-[24px] p-8"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
          boxShadow: 'var(--intro-glass-shadow)',
        }}
      >
        <h1
          className="text-gray-900 dark:text-gray-50 mb-6"
          style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '48px', lineHeight: 1.1 }}
        >
          Admin
        </h1>

        <LoginClient />
      </div>
    </div>
  );
}
