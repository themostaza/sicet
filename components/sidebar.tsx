import Link from "next/link"
import { LayoutGrid, Layers, ClipboardList, FileText } from "lucide-react"

export default function Sidebar() {
  return (
    <div className="w-60 h-full border-r bg-white flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">Sistema di Gestione</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-100">
          <LayoutGrid size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/devices" className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-100">
          <Layers size={20} />
          <span>Punti di Controllo</span>
        </Link>
        <Link href="/controlli" className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-100">
          <FileText size={20} />
          <span>Controlli</span>
        </Link>
        <Link href="/todolist" className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-100">
          <ClipboardList size={20} />
          <span>Todolist</span>
        </Link>
      </nav>
      <div className="p-4 text-xs text-gray-500 border-t">© 2023 Sistema di Gestione</div>
    </div>
  )
}
