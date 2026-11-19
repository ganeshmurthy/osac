import { Route, Routes } from 'react-router-dom';
import { create } from '@bufbuild/protobuf';
import { Code, ConnectError, createRouterTransport } from '@connectrpc/connect';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModelPhase, ModelSchema, Models } from '@osac/types';

import { ModelsListPage } from './ModelsListPage';
import { renderWithProviders } from '../../test-utils/TestProviders';

const MODELS_PATH = '/admin/maas/models';

const model = create(ModelSchema, {
  id: 'granite-3b',
  metadata: { name: 'granite-3b', annotations: { 'openshift.io/display-name': 'Granite 3B' } },
  spec: {
    sourceUri: 'hf://ibm-granite/granite-3b',
    servingProfile: 'vllm-cuda',
    placement: { clusters: ['site-a'] },
  },
  status: { phase: ModelPhase.READY },
});

const renderPage = (list: () => { size: number; total: number; items: (typeof model)[] }) => {
  const transport = createRouterTransport((router) =>
    router.service(Models, {
      list,
      get: () => ({ object: model }),
      create: (request) => ({ object: request.object }),
      update: (request) => ({ object: request.object }),
      delete: () => ({}),
      listPlacementClusters: () => ({ clusters: [] }),
    }),
  );

  return renderWithProviders(
    <Routes>
      <Route path={MODELS_PATH} element={<ModelsListPage />} />
    </Routes>,
    { transport, routerEntries: [MODELS_PATH] },
  );
};

describe('ModelsListPage', () => {
  it('renders the model inventory returned by the Models API', async () => {
    renderPage(() => ({ size: 1, total: 1, items: [model] }));

    expect(await screen.findByRole('link', { name: 'Granite 3B' })).toHaveAttribute(
      'href',
      `${MODELS_PATH}/granite-3b`,
    );
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('site-a')).toBeInTheDocument();
    expect(screen.getByText('vllm-cuda')).toBeInTheDocument();
    expect(screen.getByText('hf://ibm-granite/granite-3b')).toBeInTheDocument();
  });

  it('shows when the hub is unreachable while keeping the model visible', async () => {
    const unreachableModel = create(ModelSchema, {
      id: model.id,
      metadata: model.metadata,
      spec: model.spec,
      status: {
        phase: ModelPhase.PENDING,
        reason: 'HubUnreachable',
        message: 'The AI Grid hub is unreachable; deployment status is unavailable.',
      },
    });
    renderPage(() => ({ size: 1, total: 1, items: [unreachableModel] }));

    expect(await screen.findByRole('link', { name: 'Granite 3B' })).toBeInTheDocument();
    expect(screen.getByText('Hub unreachable')).toBeInTheDocument();
  });

  it('shows an empty state when no models are registered', async () => {
    renderPage(() => ({ size: 0, total: 0, items: [] }));

    expect(
      await screen.findByText(
        'No models yet. Add a model to the catalog, then choose where to deploy it.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error when the Models API cannot be reached', async () => {
    renderPage(() => {
      throw new ConnectError('AI Grid Hub is unavailable', Code.Unavailable);
    });

    expect(await screen.findByText(/AI Grid Hub is unavailable/)).toBeInTheDocument();
  });
});
