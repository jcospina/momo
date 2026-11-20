import type { HouseholdMemberProfile } from '@lib-types/households';
import { firstName } from '@utils/user';
import { getTranslations } from 'next-intl/server';
import { memberColorVar, memberInkVar } from '@/lib/theme/color-vars';
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
        const key = member.user_id ?? member.email ?? `${name}-${idx}`;
        return (
          <Flex key={key} alignItems="center" gap={1}>
            <Avatar
              size="extra-small"
              fill={memberColorVar(member.color_slot)}
              ink={memberInkVar(member.color_slot)}
              displayName={name}
            />
            <Typography size="lg">{name}</Typography>
          </Flex>
        );
      })}
    </Flex>
  );
}
