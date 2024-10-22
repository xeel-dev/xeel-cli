import { getExecOutput } from '@actions/exec';

export async function exec(...args: Parameters<typeof getExecOutput>) {
  return await getExecOutput(...args);
}
