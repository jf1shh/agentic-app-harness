import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Smart Recipe App',
  description: 'Manage your pantry and find recipes easily.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="brand">
            <Link href="/">SmartRecipe</Link>
          </div>
          <div className="nav-links">
            <Link href="/" className="nav-link">Dashboard</Link>
            <Link href="/inventory" className="nav-link">Inventory</Link>
            <Link href="/recipes" className="nav-link">Recipes</Link>
            <Link href="/planner" className="nav-link">Planner</Link>
          </div>
        </nav>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  )
}
