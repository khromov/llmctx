export interface QueryConfig {
	debug?: boolean
}

// Database table types
export interface DbPreset {
	id: number
	preset_name: string
	content: string
	size_kb: number
	document_count: number
	updated_at: Date
}

export interface DbDistillation {
	id: number
	preset_name: 'svelte-distilled' | 'sveltekit-distilled' | 'svelte-complete-distilled'
	version: string // 'latest' or '2024-01-15'
	content: string
	size_kb: number
	document_count: number
	distillation_job_id: number | null
	created_at: Date
}

export interface DbDistillationJob {
	id: number
	preset_name: string
	batch_id: string | null
	status: 'pending' | 'processing' | 'completed' | 'failed'
	model_used: string
	total_files: number
	processed_files: number
	successful_files: number
	minimize_applied: boolean
	started_at: Date | null
	completed_at: Date | null
	error_message: string | null
	metadata: Record<string, any> // JSONB
	created_at: Date
	updated_at: Date
}

export interface DbDistillationResult {
	id: number
	job_id: number
	file_path: string
	original_content: string
	distilled_content: string | null
	prompt_used: string
	success: boolean
	error_message: string | null
	input_tokens: number | null
	output_tokens: number | null
	created_at: Date
}

// Input types for creating/updating records
export interface CreatePresetInput {
	preset_name: string
	content: string
	size_kb: number
	document_count: number
}

export interface UpdatePresetInput {
	content: string
	size_kb: number
	document_count: number
}

export interface CreateDistillationInput {
	preset_name: 'svelte-distilled' | 'sveltekit-distilled' | 'svelte-complete-distilled'
	version: string
	content: string
	size_kb: number
	document_count: number
	distillation_job_id?: number
}

export interface CreateDistillationJobInput {
	preset_name: string
	batch_id?: string
	status: 'pending' | 'processing' | 'completed' | 'failed'
	model_used: string
	total_files: number
	minimize_applied?: boolean
	metadata?: Record<string, any>
}

export interface CreateDistillationResultInput {
	job_id: number
	file_path: string
	original_content: string
	distilled_content?: string
	prompt_used: string
	success: boolean
	error_message?: string
	input_tokens?: number
	output_tokens?: number
}
