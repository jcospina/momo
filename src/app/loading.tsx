import { MomoLoader } from '@/components/loader/loader';
import { Flex } from '@/ui/flex/flex';

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
