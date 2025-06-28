import { query } from '$lib/server/db'
import type {
	DbPreset,
	DbDistillation,
	DbDistillationJob,
	DbDistillationResult,
	CreatePresetInput,
	UpdatePresetInput,
	CreateDistillationInput,
	CreateDistillationJobInput,
	CreateDistillationResultInput
} from '$lib/types/db'
import { logAlways, logErrorAlways } from '$lib/log'

export class PresetDbService {
	/**
	 * Create or update preset content
	 */
	static async upsertPreset(input: CreatePresetInput): Promise<DbPreset> {
		try {
			// Use INSERT ... ON CONFLICT to handle race conditions atomically
			const result = await query(
				`INSERT INTO presets (
					preset_name, content, size_kb, document_count
				) VALUES ($1, $2, $3, $4)
				ON CONFLICT (preset_name) DO UPDATE SET
					content = EXCLUDED.content,
					size_kb = EXCLUDED.size_kb,
					document_count = EXCLUDED.document_count,
					updated_at = CURRENT_TIMESTAMP
				RETURNING *`,
				[input.preset_name, input.content, input.size_kb, input.document_count]
			)

			logAlways(`Upserted preset ${input.preset_name} in database`)

			return result.rows[0] as DbPreset
		} catch (error) {
			logErrorAlways(`Failed to upsert preset ${input.preset_name}:`, error)
			throw new Error(
				`Failed to upsert preset: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Get preset by name
	 */
	static async getPresetByName(presetName: string): Promise<DbPreset | null> {
		try {
			const result = await query('SELECT * FROM presets WHERE preset_name = $1', [presetName])
			return result.rows.length > 0 ? (result.rows[0] as DbPreset) : null
		} catch (error) {
			logErrorAlways(`Failed to get preset ${presetName}:`, error)
			throw new Error(
				`Failed to get preset: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Get all presets
	 */
	static async getAllPresets(): Promise<DbPreset[]> {
		try {
			const result = await query('SELECT * FROM presets ORDER BY preset_name')
			return result.rows as DbPreset[]
		} catch (error) {
			logErrorAlways('Failed to get all presets:', error)
			throw new Error(
				`Failed to get all presets: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Delete preset by name
	 */
	static async deletePreset(presetName: string): Promise<boolean> {
		try {
			const result = await query('DELETE FROM presets WHERE preset_name = $1', [presetName])
			return (result.rowCount ?? 0) > 0
		} catch (error) {
			logErrorAlways(`Failed to delete preset ${presetName}:`, error)
			throw new Error(
				`Failed to delete preset: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	// Distillation methods

	/**
	 * Create distillation version
	 */
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

	/**
	 * Get distillation by preset name and version
	 */
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

	/**
	 * Get latest distillation for a preset
	 */
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

	/**
	 * Get all distillation versions for a preset
	 */
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

	/**
	 * Create distillation job
	 */
	static async createDistillationJob(
		input: CreateDistillationJobInput
	): Promise<DbDistillationJob> {
		try {
			const result = await query(
				`INSERT INTO distillation_jobs (
					preset_name, batch_id, status, model_used, total_files, 
					minimize_applied, metadata, started_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				RETURNING *`,
				[
					input.preset_name,
					input.batch_id || null,
					input.status,
					input.model_used,
					input.total_files,
					input.minimize_applied || false,
					input.metadata ? JSON.stringify(input.metadata) : '{}',
					input.status === 'processing' ? new Date() : null
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

	/**
	 * Update distillation job
	 */
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
				completed_at: 'completed_at',
				error_message: 'error_message',
				metadata: 'metadata'
			}

			const updateFields: string[] = []
			const values: any[] = []
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

	/**
	 * Create distillation result
	 */
	static async createDistillationResult(input: CreateDistillationResultInput): Promise<void> {
		try {
			await query(
				`INSERT INTO distillation_results (
					job_id, file_path, original_content, distilled_content,
					prompt_used, success, error_message, input_tokens, output_tokens
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				[
					input.job_id,
					input.file_path,
					input.original_content,
					input.distilled_content || null,
					input.prompt_used,
					input.success,
					input.error_message || null,
					input.input_tokens || null,
					input.output_tokens || null
				]
			)
		} catch (error) {
			logErrorAlways('Failed to create distillation result:', error)
			throw new Error(
				`Failed to create distillation result: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Get distillation jobs for a preset
	 */
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
