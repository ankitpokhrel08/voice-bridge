import ListOnlineUsers from "@/components/ListOnlineUsers";
import CallNotification from "@/components/ui/CallNotification";

export default function Home() {
  return (
    <div>
      <ListOnlineUsers />
      <CallNotification />
    </div>
  );
}
