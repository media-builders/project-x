"use client"

import { LogOut } from "lucide-react"
import { logout } from "@/app/auth/actions"

export default function Logout() {
  return (
    <form action={logout} className="w-full">
      <button type="submit" className="w-full flex items-center">
        <LogOut className="mr-2 h-4 w-4" />
        <span>Log out</span>
      </button>
    </form>
  )
}
