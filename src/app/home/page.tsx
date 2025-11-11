import { logout } from '@actions/logout';
import { getCurrentUser } from '@auth/user';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }
  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center gap-3
    "
    >
      <div className="font-cherry-bomb-one text-9xl text-accent">MoMo</div>
      <div className="font-poppins">Hello {user.user_metadata?.name}</div>
      <form>
        <button
          formAction={logout}
          className="border border-rust rounded-md px-2 py-1 bg-rufous text-foreground"
        >
          Logout
        </button>
      </form>
    </div>
  );
}
