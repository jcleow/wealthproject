import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-gray-400">Sign in to continue to Assetra</p>
        </div>

        {/* Form Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
