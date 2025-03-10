import { HttpResponseInit } from '@azure/functions';

export type SpecificHttpResponseInit<TBody> = {
  [key in keyof HttpResponseInit]: key extends 'jsonBody' ? TBody : HttpResponseInit[key];
};
