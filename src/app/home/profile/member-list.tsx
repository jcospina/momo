import { Avatar } from '@components/avatar/avatar';
import { Flex } from '@components/flex/flex';
import { Typography } from '@components/typography/typography';
import type { HouseholdMemberProfile } from '@lib-types/households';
import { firstName } from '@utils/user';

type MemberListProps = {
  userEmail: string;
  members: HouseholdMemberProfile[];
};

export function MemberList({ userEmail, members }: MemberListProps) {
  const otherMembers = members.filter(member => member.email !== userEmail);
  if (!otherMembers.length) {
    return (
      <Typography>
        What is the point of a household if you don&apos;t bring in your family?
      </Typography>
    );
  }

  return (
    <Flex direction="column" gap={1}>
      {otherMembers.map((member, idx) => {
        const name = firstName(member.display_name, member.email);
        const key = member.email ?? `${name}-${idx}`;
        return (
          <Flex key={key} alignItems="center" gap={1}>
            <Avatar size="extra-small" color="mauve-magic" displayName={name} />
            <Typography size="lg">{name}</Typography>
          </Flex>
        );
      })}
    </Flex>
  );
}
