import type { HandleClientError } from '@sveltejs/kit';
import { DatabaseError } from '$lib/db';

export const handleError: HandleClientError = ({ error }) => ({
    message: error instanceof Error ? error.message : String(error),
    database: error instanceof DatabaseError,
});
