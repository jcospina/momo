import Link from 'next/link';

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
      <Link
        href="/home/invite"
        className="rounded-md border border-rust px-3 py-2 text-foreground transition hover:bg-foreground/10"
      >
        Invite household members
      </Link>
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
