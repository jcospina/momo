import { loginWithProvider } from '@actions/login';

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center gap-3">
      <div className="font-cherry-bomb-one text-9xl text-gamboge">MoMo</div>
      <div className="font-poppins font-extralight text-4xl">Welcome</div>
      <form>
        <button
          formAction={loginWithProvider.bind(null, 'google')}
          className="border border-rust rounded-md px-2 py-1 bg-rufous text-foreground"
        >
          Sign in with Google
        </button>
      </form>
    </div>
  );
}
