import {
  createHousehold as createHouseholdAction,
  createHouseholdInline as createHouseholdInlineAction,
} from '@actions/households';

import { create, createInline } from './client';

jest.mock('@actions/households', () => ({
  createHousehold: jest.fn(),
  createHouseholdInline: jest.fn(),
}));

describe('data/households/client facade', () => {
  const createHouseholdMock = jest.mocked(createHouseholdAction);
  const createHouseholdInlineMock = jest.mocked(createHouseholdInlineAction);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates create action', async () => {
    const formData = new FormData();
    const prevState = {};
    createHouseholdMock.mockResolvedValue({});

    await create(prevState, formData);

    expect(createHouseholdMock).toHaveBeenCalledWith(prevState, formData);
  });

  it('delegates inline create action', async () => {
    const formData = new FormData();
    const prevState = {};
    createHouseholdInlineMock.mockResolvedValue({});

    await createInline(prevState, formData);

    expect(createHouseholdInlineMock).toHaveBeenCalledWith(prevState, formData);
  });
});
