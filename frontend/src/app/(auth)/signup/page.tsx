import Link from 'next/link'
import { SignUpForm } from '@/components/auth/SignUpForm'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-gray-400">Start your financial planning journey</p>
        </div>

        {/* Form Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <SignUpForm />
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
