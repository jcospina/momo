import { MomoLoader } from '@/components/loader/loader';
import { Flex } from '@/ui/flex/flex';

// Loading UI for the site's own routes (landing, auth, onboarding, invites).
// /home sits outside this group on purpose: its pages stream a navbar and a
// skeleton of their own, which would otherwise wait behind this loader.
export default function Loading() {
  return (
    <Flex
      isFullWidth
      className="full-h"
      justifyContent="center"
      alignItems="center"
    >
      <MomoLoader size="xxl" />
    </Flex>
  );
}
