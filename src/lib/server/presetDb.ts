import { query } from '$lib/server/db'
import type {
	DbDistillation,
	DbDistillationJob,
	CreateDistillationInput,
	CreateDistillationJobInput
} from '$lib/types/db'
import { logAlways, logErrorAlways } from '$lib/log'

export class PresetDbService {
	static async createDistillation(input: CreateDistillationInput): Promise<DbDistillation> {
		try {
			// Use INSERT ... ON CONFLICT to handle race conditions atomically
			const result = await query(
				`INSERT INTO distillations (
					preset_name, version, content, size_kb, document_count, distillation_job_id
				) VALUES ($1, $2, $3, $4, $5, $6)
				ON CONFLICT (preset_name, version) DO UPDATE SET
					content = EXCLUDED.content,
					size_kb = EXCLUDED.size_kb,
					document_count = EXCLUDED.document_count,
					distillation_job_id = EXCLUDED.distillation_job_id
				RETURNING *`,
				[
					input.preset_name,
					input.version,
					input.content,
					input.size_kb,
					input.document_count,
					input.distillation_job_id || null
				]
			)

			logAlways(`Upserted distillation ${input.preset_name} version ${input.version}`)

			return result.rows[0] as DbDistillation
		} catch (error) {
			logErrorAlways(`Failed to create distillation for ${input.preset_name}:`, error)
			throw new Error(
				`Failed to create distillation: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async getDistillationByVersion(
		presetName: string,
		version: string
	): Promise<DbDistillation | null> {
		try {
			const result = await query(
				'SELECT * FROM distillations WHERE preset_name = $1 AND version = $2',
				[presetName, version]
			)
			return result.rows.length > 0 ? (result.rows[0] as DbDistillation) : null
		} catch (error) {
			logErrorAlways(`Failed to get distillation ${presetName} version ${version}:`, error)
			throw new Error(
				`Failed to get distillation: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async getLatestDistillation(presetName: string): Promise<DbDistillation | null> {
		try {
			const result = await query(
				'SELECT * FROM distillations WHERE preset_name = $1 AND version = $2',
				[presetName, 'latest']
			)
			return result.rows.length > 0 ? (result.rows[0] as DbDistillation) : null
		} catch (error) {
			logErrorAlways(`Failed to get latest distillation for ${presetName}:`, error)
			throw new Error(
				`Failed to get latest distillation: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async getAllDistillationsForPreset(presetName: string): Promise<DbDistillation[]> {
		try {
			const result = await query(
				'SELECT * FROM distillations WHERE preset_name = $1 ORDER BY created_at DESC',
				[presetName]
			)
			return result.rows as DbDistillation[]
		} catch (error) {
			logErrorAlways(`Failed to get all distillations for ${presetName}:`, error)
			throw new Error(
				`Failed to get all distillations: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async createDistillationJob(
		input: CreateDistillationJobInput
	): Promise<DbDistillationJob> {
		try {
			const result = await query(
				`INSERT INTO distillation_jobs (
					preset_name, batch_id, status, model_used, total_files, 
					minimize_applied, metadata, started_at, total_input_tokens, total_output_tokens
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
				RETURNING *`,
				[
					input.preset_name,
					input.batch_id || null,
					input.status,
					input.model_used,
					input.total_files,
					input.minimize_applied || false,
					input.metadata ? JSON.stringify(input.metadata) : '{}',
					input.status === 'processing' ? new Date() : null,
					0, // total_input_tokens - initialize to 0
					0 // total_output_tokens - initialize to 0
				]
			)

			return result.rows[0] as DbDistillationJob
		} catch (error) {
			logErrorAlways('Failed to create distillation job:', error)
			throw new Error(
				`Failed to create distillation job: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async updateDistillationJob(
		jobId: number,
		updates: Partial<DbDistillationJob>
	): Promise<DbDistillationJob> {
		try {
			// Secure whitelist mapping - prevents SQL injection by using predefined column names
			const allowedFieldsMap: Record<string, string> = {
				batch_id: 'batch_id',
				status: 'status',
				processed_files: 'processed_files',
				successful_files: 'successful_files',
				total_input_tokens: 'total_input_tokens',
				total_output_tokens: 'total_output_tokens',
				completed_at: 'completed_at',
				error_message: 'error_message',
				metadata: 'metadata'
			}

			const updateFields: string[] = []
			const values: unknown[] = []
			let paramCount = 1

			for (const [key, value] of Object.entries(updates)) {
				// Strict validation: only allow fields that exist in our secure mapping
				const columnName = allowedFieldsMap[key]
				if (columnName) {
					updateFields.push(`${columnName} = $${paramCount}`)
					values.push(value)
					paramCount++
				} else {
					throw new Error(`Invalid field for update: ${key}`)
				}
			}

			if (updateFields.length === 0) {
				throw new Error('No valid fields provided for update')
			}

			values.push(jobId)

			const result = await query(
				`UPDATE distillation_jobs SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
				values
			)

			if (result.rows.length === 0) {
				throw new Error(`Distillation job with id ${jobId} not found`)
			}

			return result.rows[0] as DbDistillationJob
		} catch (error) {
			logErrorAlways(`Failed to update distillation job ${jobId}:`, error)
			throw new Error(
				`Failed to update distillation job: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async getDistillationJobsForPreset(presetName: string): Promise<DbDistillationJob[]> {
		try {
			const result = await query(
				'SELECT * FROM distillation_jobs WHERE preset_name = $1 ORDER BY created_at DESC',
				[presetName]
			)
			return result.rows as DbDistillationJob[]
		} catch (error) {
			logErrorAlways(`Failed to get distillation jobs for ${presetName}:`, error)
			throw new Error(
				`Failed to get distillation jobs: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}
}
