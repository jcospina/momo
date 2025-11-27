import { InviteForm } from './invite-form';

export default function InvitePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="font-cherry-bomb-one text-5xl text-gamboge">
          Invite to your household
        </h1>
        <p className="mt-2 text-foreground">
          Send up to four invites. If an invitee is already part of any
          household, we&rsquo;ll let you know.
        </p>
      </div>
      <InviteForm />
    </div>
  );
}
