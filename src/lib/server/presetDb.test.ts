import { describe, it, expect, vi } from 'vitest'
import { PresetDbService } from './presetDb'
import { DistillablePreset } from '$lib/types/db'
import * as db from './db'

// Mock the database module
vi.mock('./db', () => ({
	query: vi.fn()
}))

describe('PresetDbService', () => {
	describe('createDistillation', () => {
		it('should handle concurrent inserts without race conditions', async () => {
			const mockQuery = vi.mocked(db.query)

			// Mock successful INSERT ... ON CONFLICT
			mockQuery.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						preset_name: DistillablePreset.SVELTE_DISTILLED,
						version: 'latest',
						content: 'distilled content',
						size_kb: 20,
						document_count: 5,
						distillation_job_id: null,
						created_at: new Date()
					}
				],
				rowCount: 1,
				command: 'INSERT',
				oid: 0,
				fields: []
			})

			const result = await PresetDbService.createDistillation({
				preset_name: DistillablePreset.SVELTE_DISTILLED,
				version: 'latest',
				content: 'distilled content',
				size_kb: 20,
				document_count: 5
			})

			expect(result).toBeDefined()
			expect(result.preset_name).toBe(DistillablePreset.SVELTE_DISTILLED)
			expect(result.version).toBe('latest')

			// Verify the query uses INSERT ... ON CONFLICT
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('INSERT INTO distillations'),
				expect.any(Array)
			)
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('ON CONFLICT (preset_name, version) DO UPDATE'),
				expect.any(Array)
			)
		})
	})

	describe('createDistillationJob', () => {
		it('should create a job with token fields initialized to 0', async () => {
			const mockQuery = vi.mocked(db.query)

			// Mock successful job creation
			mockQuery.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						preset_name: 'test-preset',
						batch_id: null,
						status: 'pending',
						model_used: 'claude-sonnet-4-20250514',
						total_files: 10,
						processed_files: 0,
						successful_files: 0,
						minimize_applied: false,
						total_input_tokens: 0,
						total_output_tokens: 0,
						started_at: null,
						completed_at: null,
						error_message: null,
						metadata: {},
						created_at: new Date(),
						updated_at: new Date()
					}
				],
				rowCount: 1,
				command: 'INSERT',
				oid: 0,
				fields: []
			})

			const result = await PresetDbService.createDistillationJob({
				preset_name: 'test-preset',
				status: 'pending',
				model_used: 'claude-sonnet-4-20250514',
				total_files: 10
			})

			expect(result).toBeDefined()
			expect(result.total_input_tokens).toBe(0)
			expect(result.total_output_tokens).toBe(0)

			// Verify the query includes token fields
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('total_input_tokens'),
				expect.arrayContaining([0, 0]) // Should include the token values
			)
		})
	})

	describe('updateDistillationJob', () => {
		it('should allow updating token fields', async () => {
			const mockQuery = vi.mocked(db.query)

			// Mock successful update
			mockQuery.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						preset_name: 'test-preset',
						total_input_tokens: 1000,
						total_output_tokens: 500,
						status: 'completed'
					}
				],
				rowCount: 1,
				command: 'UPDATE',
				oid: 0,
				fields: []
			})

			const result = await PresetDbService.updateDistillationJob(1, {
				total_input_tokens: 1000,
				total_output_tokens: 500,
				status: 'completed'
			})

			expect(result).toBeDefined()
			expect(result.total_input_tokens).toBe(1000)
			expect(result.total_output_tokens).toBe(500)

			// Verify the query updates token fields
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('total_input_tokens'),
				expect.arrayContaining([1000, 500, 'completed', 1])
			)
		})
	})
})
