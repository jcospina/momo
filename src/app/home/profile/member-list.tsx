import type { HouseholdMemberProfile } from '@lib-types/households';
import { firstName } from '@utils/user';
import { getTranslations } from 'next-intl/server';
import { Avatar } from '@/ui/avatar/avatar';
import { Flex } from '@/ui/flex/flex';
import { Typography } from '@/ui/typography/typography';

type MemberListProps = {
  userEmail: string;
  members: HouseholdMemberProfile[];
};

export async function MemberList({ userEmail, members }: MemberListProps) {
  const t = await getTranslations('profile');
  const otherMembers = members.filter(member => member.email !== userEmail);
  if (!otherMembers.length) {
    return <Typography>{t('memberEmpty')}</Typography>;
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
