import {
  createHousehold as createHouseholdAction,
  createHouseholdInline as createHouseholdInlineAction,
} from '@actions/households';

import type { Create, CreateInline } from './types';

export const create: Create = async (prevState, formData) =>
  createHouseholdAction(prevState, formData);

export const createInline: CreateInline = async (prevState, formData) =>
  createHouseholdInlineAction(prevState, formData);
