import { Flex } from '@ui/flex/flex';
import { SendIcon } from '@ui/icons/send';
import styles from './chat.module.css';
export function SendButton() {
  return (
    <Flex
      as="button"
      justifyContent="center"
      alignItems="center"
      className={styles['momo-chat__send-button']}
    >
      <SendIcon />
    </Flex>
  );
}
