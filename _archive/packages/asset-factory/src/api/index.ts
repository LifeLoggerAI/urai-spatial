
import { Campaign, Job } from '../core/types';

// This is a placeholder for a real router (e.g., Express, Hono, etc.)
// We define the types to ensure our handlers adhere to a contract.
interface Request {
  body: any;
  params: { [key: string]: string };
}

interface Response {
  status(code: number): this;
  send(data: any): void;
}

interface App {
  post(path: string, handler: (req: Request, res: Response) => void): void;
  get(path: string, handler: (req: Request, res: Response) => void): void;
}

/**
 * Initializes the Asset Factory API endpoints.
 * @param app - An Express-like application instance.
 */
export function initializeApi(app: App) {
  /**
   * @summary Create a new Campaign
   * @route POST /v1/campaigns
   */
  app.post('/v1/campaigns', (req: Request, res: Response) => {
    const { name, brandKitId, platforms, aspectRatios, copyBlocks, assets } = req.body;
    if (!name || !brandKitId || !platforms || !aspectRatios) {
      return res.status(400).send({ error: 'Validation failed: Missing required campaign fields.' });
    }

    const now = new Date().toISOString();
    const newCampaign: Campaign = {
      id: `cmp_${Math.random().toString(36).slice(2, 11)}`,
      createdAt: now,
      updatedAt: now,
      name,
      brandKitId,
      platforms,
      aspectRatios,
      copyBlocks: copyBlocks || {},
      assets: assets || {},
    };

    console.log('PERSISTING CAMPAIGN:', JSON.stringify(newCampaign, null, 2));
    res.status(201).send(newCampaign);
  });

  /**
   * @summary Get a Campaign by ID
   * @route GET /v1/campaigns/{campaignId}
   */
  app.get('/v1/campaigns/:campaignId', (req: Request, res: Response) => {
    const { campaignId } = req.params;
    console.log(`FETCHING CAMPAIGN: ${campaignId}`);
    res.status(404).send({ error: `Campaign ${campaignId} not found.` });
  });

  /**
   * @summary Generate asset variants for a campaign
   * @route POST /v1/campaigns/{campaignId}/generate
   */
  app.post('/v1/campaigns/:campaignId/generate', (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const { variantLimit = 100, templateVersion = 'v3' } = req.body;

    const newJob: Job = {
      id: `job_${Math.random().toString(36).slice(2, 11)}`,
      campaignId,
      status: 'queued',
      progress: 0,
      variantLimit,
      templateVersion,
      createdAt: new Date().toISOString(),
    };

    console.log('QUEUING JOB:', JSON.stringify(newJob, null, 2));
    res.status(202).send(newJob);
  });

  /**
   * @summary Get the status of a Job
   * @route GET /v1/jobs/{jobId}
   */
  app.get('/v1/jobs/:jobId', (req: Request, res: Response) => {
    const { jobId } = req.params;
    console.log(`FETCHING JOB: ${jobId}`);

    const job: Job = {
      id: jobId,
      campaignId: 'cmp_placeholder',
      status: 'processing',
      progress: 65,
      variantLimit: 100,
      templateVersion: 'v3',
      createdAt: new Date().toISOString(),
    };

    res.status(200).send(job);
  });

  /**
   * @summary Get the results of a Job
   * @route GET /v1/jobs/{jobId}/results
   * @description Retrieves the generated asset URLs for a completed job.
   */
  app.get('/v1/jobs/:jobId/results', (req: Request, res: Response) => {
    const { jobId } = req.params;
    console.log(`FETCHING RESULTS FOR JOB: ${jobId}`);

    // In a real system, you would check if the job is actually complete.
    const results = {
      files: [
        { url: 'https://cdn.assetfactory.io/cmp_placeholder/1.png', size: '1080x1080', platform: 'meta' },
        { url: 'https://cdn.assetfactory.io/cmp_placeholder/2.png', size: '1080x1920', platform: 'meta' },
      ]
    };

    res.status(200).send(results);
  });
}
