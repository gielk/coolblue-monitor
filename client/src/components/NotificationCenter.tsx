import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Trash2, CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function NotificationCenter() {
  const utils = trpc.useUtils();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications, isLoading } = trpc.notifications.list.useQuery(
    { limit: 50 },
    { enabled: isOpen }
  );

  const { data: unreadCount } = trpc.notifications.unread.useQuery(undefined, {
    enabled: isOpen,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unread.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("Alle notificaties gelezen");
      utils.notifications.list.invalidate();
      utils.notifications.unread.invalidate();
    },
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unread.invalidate();
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "tweedekans_available":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "product_error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "tweedekans_available":
        return "bg-green-50 border-green-200";
      case "product_error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount && unreadCount.length > 0 && (
            <Badge
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-red-600"
              variant="destructive"
            >
              {Math.min(unreadCount.length, 9)}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notificaties</DialogTitle>
          <DialogDescription>
            {unreadCount && unreadCount.length > 0
              ? `Je hebt ${unreadCount.length} ongelezen notificatie${unreadCount.length !== 1 ? "s" : ""}`
              : "Geen ongelezen notificaties"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header Actions */}
          <div className="flex gap-2">
            {unreadCount && unreadCount.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                Alles als gelezen
              </Button>
            )}
          </div>

          {/* Notifications List */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-slate-500">Notificaties laden...</div>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border ${getNotificationColor(notification.type)} ${!notification.isRead ? "border-l-4 border-l-blue-600" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-slate-900">{notification.title}</h4>
                          {!notification.isRead && (
                            <Badge variant="secondary" className="text-xs">
                              Nieuw
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500">
                            {new Date(notification.createdAt).toLocaleString("nl-NL")}
                          </span>
                          {notification.actionUrl && (
                            <a
                              href={notification.actionUrl}
                              className="text-xs text-blue-600 hover:underline"
                              onClick={() => setIsOpen(false)}
                            >
                              Bekijk
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!notification.isRead && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsReadMutation.mutate({ notificationId: notification.id })}
                            disabled={markAsReadMutation.isPending}
                            title="Markeer als gelezen"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate({ notificationId: notification.id })}
                          disabled={deleteMutation.isPending}
                          title="Verwijder"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-600">Geen notificaties</p>
              <p className="text-sm text-slate-500">Je bent helemaal bij!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
