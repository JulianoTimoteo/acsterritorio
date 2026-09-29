import { Bell, Check, Trash2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notification } from "@/lib/database";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationBell() {
  const { data: notifications = [], unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -right-1 -top-1 size-5 flex items-center justify-center p-0 text-[10px] animate-in zoom-in"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="font-[Sora,sans-serif] text-sm font-semibold">Notificações</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAllAsRead.mutate()}
              className="h-auto px-2 py-1 text-xs"
            >
              Ler todas
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação por enquanto.
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n: Notification) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex flex-col gap-1 border-b p-4 transition-colors hover:bg-accent/50 group relative",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm leading-tight">{n.title}</span>
                    <div className="flex items-center gap-1">
                       {!n.read && (
                        <button
                          onClick={() => markAsRead.mutate(n.id)}
                          className="text-primary hover:text-primary/80 transition-opacity"
                          title="Marcar como lida"
                        >
                          <Check className="size-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification.mutate(n.id)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Excluir"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">{n.message}</p>
                  <span className="text-[10px] text-muted-foreground/60 mt-1">
                    {format(new Date(n.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
