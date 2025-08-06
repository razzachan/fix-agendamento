import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  Wrench,
  Home,
  FileCheck,
  FileX,
  LucideIcon,
  Hourglass,
  ClipboardCheck,
  ThumbsUp,
  ShoppingCart,
  Hammer,
  CheckCheck,
  CalendarClock,
  PackageCheck
} from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
    scheduled: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
    in_progress: 'bg-blue-700/10 text-blue-700 hover:bg-blue-700/20',
    pickup_scheduled: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
    picked_up: 'bg-purple-700/10 text-purple-700 hover:bg-purple-700/20',
    at_workshop: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20',
    diagnosed: 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20',
    awaiting_approval: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
    approved: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
    parts_ordered: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20',
    under_repair: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20',
    repaired: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20',
    delivery_scheduled: 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20',
    delivered: 'bg-green-700/10 text-green-700 hover:bg-green-700/20',
    completed: 'bg-green-800/10 text-green-800 hover:bg-green-800/20',
    cancelled: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
  };

  return statusMap[status] || 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
}

export function getStatusIcon(status: string): LucideIcon {
  const statusMap: Record<string, LucideIcon> = {
    pending: Hourglass,
    scheduled: Calendar,
    in_progress: Clock,
    pickup_scheduled: CalendarClock,
    picked_up: Truck,
    at_workshop: Home,
    received_at_workshop: Home,
    diagnosed: ClipboardCheck,
    diagnosis_completed: ClipboardCheck,
    awaiting_quote_approval: AlertCircle,
    awaiting_approval: AlertCircle,
    quote_approved: ThumbsUp,
    approved: ThumbsUp,
    parts_ordered: ShoppingCart,
    under_repair: Wrench,
    repaired: Hammer,
    delivery_scheduled: Package,
    delivered: PackageCheck,
    completed: CheckCircle2,
    cancelled: FileX,
  };

  return statusMap[status] || AlertCircle;
}

export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pendente',
    scheduled: 'Agendado',
    in_progress: 'Em Andamento',
    pickup_scheduled: 'Coleta Agendada',
    picked_up: 'Coletado',
    at_workshop: 'Na Oficina',
    received_at_workshop: 'Recebido na Oficina',
    diagnosed: 'Diagnosticado',
    diagnosis_completed: 'Diagnóstico Concluído',
    awaiting_quote_approval: 'Aguardando Aprovação do Orçamento',
    awaiting_approval: 'Aguardando Aprovação',
    quote_approved: 'Orçamento Aprovado',
    approved: 'Aprovado',
    parts_ordered: 'Peças Encomendadas',
    under_repair: 'Em Reparo',
    repaired: 'Reparado',
    delivery_scheduled: 'Entrega Agendada',
    delivered: 'Entregue',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  return statusMap[status] || status;
}
