import { loginWithProvider } from '@actions/login';
import { Button } from '@components/button/button';
import { Panel } from '@components/panel/panel';

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <Panel className="flex flex-col gap-12 items-center justify-center py-12">
        <div className="flex flex-col gap-1 p-3 items-center justify-center w-full">
          <div className="text-4xl text-foreground">Welcome to</div>
          <div className="font-logo font-extrabold text-7xl lg:text-9xl">
            MoMo
          </div>
        </div>
        <form>
          <Button
            variant="primary"
            formAction={loginWithProvider.bind(null, 'google')}
            className="text-2xl"
          >
            Sign in with Google
          </Button>
        </form>
      </Panel>
    </div>
  );
}
