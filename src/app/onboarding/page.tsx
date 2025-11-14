import { getCurrentUser } from '@auth/user';
import { getHouseholdMembershipForUser } from '@helpers/households';
import { redirect } from 'next/navigation';
import { HouseholdForm } from './household-form';

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const membership = await getHouseholdMembershipForUser(user.id);

  if (membership) {
    redirect('/home');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-xl border border-rust bg-foreground/5 p-8 shadow-lg">
        <h1 className="font-cherry-bomb-one text-6xl text-gamboge">Welcome</h1>
        <p className="mt-2 font-poppins text-lg text-foreground">
          Let&apos;s set up your household so you can start tracking expenses.
        </p>
        <div className="mt-8">
          <HouseholdForm />
        </div>
      </div>
    </div>
  );
}
