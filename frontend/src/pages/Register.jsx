import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'

function Register() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (fullName.trim().length < 2) {
      setError('Nama lengkap minimal 2 karakter.')
      return
    }

    if (password.length < 8) {
      setError('Password harus terdiri dari minimal 8 karakter.')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }

    setLoading(true)

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          password,
        }),
      })

      // Kirim success message & email ke halaman Login via router state.
      navigate('/login', {
        replace: true,
        state: {
          successMessage: 'Akun berhasil dibuat! Silakan masuk dengan akun barumu.',
          email: email.trim(),
        },
      })
    } catch (err) {
      setError(err.message || 'Registrasi gagal. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
            K
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Buat akun Kerjain
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Bergabung dan mulai langkah baru bersama Kerjain.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Nama lengkap
            </label>

            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Masukkan nama lengkap"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="registerEmail"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="registerEmail"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Nomor telepon
            </label>

            <input
              id="phone"
              pattern="(\+?[0-9]([0-9\s()-]*[0-9])?)"
              title="Masukkan nomor telepon yang valid, hanya angka dan pemisah nomor."
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              placeholder="Contoh: 08xxxxxxxxxx"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="registerPassword"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="registerPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Konfirmasi password
            </label>

            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Masukkan ulang password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            Tampilkan password
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Membuat akun...' : 'Daftar sekarang'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:text-blue-800"
          >
            Masuk
          </Link>
        </p>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          Kerjain · Mulai langkahmu dari sini.
        </p>
      </section>
    </main>
  )
}

export default Register
