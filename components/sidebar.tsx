import { LayoutGrid, Layers, ClipboardList, FileText } from "lucide-react"
import NavLinkWithLoading from "./ui/NavLinkWithLoading"

export default function Sidebar() {
  return (
    <div className="w-60 h-full border-r bg-white flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">Sistema di Gestione</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <NavLinkWithLoading href="/dashboard" className="flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors">
          <LayoutGrid size={20} />
          <span>Dashboard</span>
        </NavLinkWithLoading>
        <NavLinkWithLoading href="/devices" className="flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors">
          <Layers size={20} />
          <span>Punti di Controllo</span>
        </NavLinkWithLoading>
        <NavLinkWithLoading href="/kpis" className="flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors">
          <FileText size={20} />
          <span>Controlli</span>
        </NavLinkWithLoading>
        <NavLinkWithLoading href="/todolist" className="flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors">
          <ClipboardList size={20} />
          <span>Todolist</span>
        </NavLinkWithLoading>
        <NavLinkWithLoading href="/export" className="flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors">
          <FileText size={20} />
          <span>Esporta Dati</span>
        </NavLinkWithLoading>
      </nav>
    </div>
  )
}
