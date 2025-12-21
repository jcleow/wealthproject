'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { signUp } from '@/lib/auth-client'
import { signUpSchema, type SignUpFormData } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SignUpForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  const onSubmit = async (data: SignUpFormData) => {
    setServerError(null)

    try {
      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        callbackURL: '/dashboard',
      })

      if (result.error) {
        setServerError(result.error.message || 'Could not create account')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setServerError('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
          Full Name
        </label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="John Doe"
          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          {...register('name')}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          {...register('email')}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          {...register('password')}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <div className={`px-4 py-2
border border-red-500/50 rounded-md
bg-red-500/10
text-red-400 text-sm`}>
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  )
}
