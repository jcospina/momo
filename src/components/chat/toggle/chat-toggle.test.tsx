import { fireEvent, render, screen } from '@testing-library/react';
import { ChatToggle } from './chat-toggle';

jest.mock('@providers/profile-provider', () => ({
  useProfile: () => ({
    display_name: 'Juan Cospina',
  }),
}));

jest.mock('@ui/toggle-group/toggle-group', () => ({
  ToggleGroup: ({
    items,
    value,
    onValueChange,
  }: {
    items: Array<{ label: string; value: string }>;
    value?: string[];
    onValueChange?: (value: string[]) => void;
  }) => (
    <div data-testid="chat-toggle-group">
      {items.map(item => (
        <button
          key={item.value}
          type="button"
          aria-label={item.label}
          data-selected={value?.includes(item.value) ? 'true' : 'false'}
          onClick={() => onValueChange?.([item.value])}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

describe('ChatToggle', () => {
  it('renders profile and household names as tab labels', () => {
    const onChange = jest.fn();

    render(
      <ChatToggle
        active="household"
        onChange={onChange}
        householdName="Casa MoMo"
      />,
    );

    const personalTab = screen.getByRole('button', { name: 'Juan Cospina' });
    const householdTab = screen.getByRole('button', { name: 'Casa MoMo' });

    expect(personalTab).toHaveAttribute('data-selected', 'false');
    expect(householdTab).toHaveAttribute('data-selected', 'true');

    fireEvent.click(personalTab);
    expect(onChange).toHaveBeenCalledWith('personal');
  });

  it('omits the household tab when household scope is unavailable', () => {
    const onChange = jest.fn();

    render(
      <ChatToggle
        active="personal"
        onChange={onChange}
        showHousehold={false}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Juan Cospina' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Casa MoMo' }),
    ).not.toBeInTheDocument();
  });
});
