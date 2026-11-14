import { JobTypeConfig, JobTypeOptions } from './jobs.types';
import { VideoToResumeSteps } from './processors/video-to-resume/steps';
import { VideoToTranscriptSteps } from './processors/video-to-transcript/steps';

describe('JobTypeConfig', () => {
  it('when listing job types, should have a config for each type', () => {
    expect(Object.keys(JobTypeConfig).sort()).toEqual(
      Object.values(JobTypeOptions).sort(),
    );
  });

  it('when reading any config, should have label, description and steps with name/label', () => {
    for (const config of Object.values(JobTypeConfig)) {
      expect(config.label).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(config.steps.length).toBeGreaterThan(0);

      for (const step of config.steps) {
        expect(step.name).toBeTruthy();
        expect(step.label).toBeTruthy();
      }
    }
  });

  it('when type is video-to-transcript, should have a pipeline without summarize', () => {
    const names = JobTypeConfig['video-to-transcript'].steps.map((s) => s.name);

    expect(names).toEqual([
      VideoToTranscriptSteps.DOWNLOAD_VIDEO.name,
      VideoToTranscriptSteps.CONVERT_TO_AUDIO.name,
      VideoToTranscriptSteps.DELETE_VIDEO.name,
      VideoToTranscriptSteps.TRANSCRIBE.name,
      VideoToTranscriptSteps.SAVE_FILE.name,
      VideoToTranscriptSteps.DELETE_AUDIO.name,
    ]);
  });

  it('when type is video-to-summary, should summarize between transcribe and save', () => {
    const names = JobTypeConfig['video-to-summary'].steps.map((s) => s.name);

    expect(names).toEqual([
      VideoToResumeSteps.DOWNLOAD_VIDEO.name,
      VideoToResumeSteps.CONVERT_TO_AUDIO.name,
      VideoToResumeSteps.DELETE_VIDEO.name,
      VideoToResumeSteps.TRANSCRIBE.name,
      VideoToResumeSteps.SUMMARIZE.name,
      VideoToResumeSteps.SAVE_FILE.name,
      VideoToResumeSteps.DELETE_AUDIO.name,
    ]);
  });
});
