"use client"

import { LogOut } from "lucide-react"
import { logout } from "@/app/auth/actions"

export default function Logout() {
  return (
    <form action={logout} className="w-full">
      <button type="submit" className="w-full flex items-center">
        <span className="menu-item-content">
          <LogOut className="menu-icon" />
          Log out
        </span>
      </button>
    </form>
  )
}
