import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { create } from '@bufbuild/protobuf';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Checkbox,
  FormGroup,
  PageSection,
  Stack,
  StackItem,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import type { TFunction } from 'i18next';

import {
  ModelComputeResourcesSchema,
  ModelDeploymentPhase,
  ModelMaasPhase,
  ModelPhase,
  ModelPlacementSchema,
  ModelSchema,
  ModelSpecSchema,
} from '@osac/types';

import { useDeleteModel, useModel, useUpdateModel } from '../../api/v1/model';
import DeleteResourceModal from '../../components/Resource/DeleteResourceModal';
import { useTranslation } from '../../hooks/useTranslation';

const modelPhaseLabel = (phase: ModelPhase, t: TFunction): string => {
  switch (phase) {
    case ModelPhase.READY:
      return t('Ready');
    case ModelPhase.PARTIAL:
      return t('Partially ready');
    case ModelPhase.FAILED:
      return t('Failed');
    case ModelPhase.PENDING:
      return t('Pending');
    default:
      return t('Unknown');
  }
};

const deploymentPhaseLabel = (phase: ModelDeploymentPhase, t: TFunction): string => {
  switch (phase) {
    case ModelDeploymentPhase.READY:
      return t('Ready');
    case ModelDeploymentPhase.FAILED:
      return t('Failed');
    case ModelDeploymentPhase.STOPPED:
      return t('Stopped');
    case ModelDeploymentPhase.PENDING:
      return t('Pending');
    default:
      return t('Unknown');
  }
};

const maasPhaseLabel = (phase: ModelMaasPhase, t: TFunction): string => {
  switch (phase) {
    case ModelMaasPhase.READY:
      return t('Ready');
    case ModelMaasPhase.AWAITING_SUBSCRIPTION:
      return t('Awaiting subscription');
    case ModelMaasPhase.FAILED:
      return t('Failed');
    case ModelMaasPhase.UNAVAILABLE:
      return t('Unavailable');
    case ModelMaasPhase.PENDING:
      return t('Pending');
    default:
      return t('Unknown');
  }
};

export const ModelDetailsPage = () => {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: model, isLoading, error } = useModel(id);
  const updateModel = useUpdateModel();
  const deleteModel = useDeleteModel();
  const [replicas, setReplicas] = useState('');
  const [cpuRequest, setCpuRequest] = useState('');
  const [memoryRequest, setMemoryRequest] = useState('');
  const [gpuRequest, setGpuRequest] = useState('');
  const [cpuLimit, setCpuLimit] = useState('');
  const [memoryLimit, setMemoryLimit] = useState('');
  const [gpuLimit, setGpuLimit] = useState('');
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!model) {
      return;
    }
    setReplicas(model.spec?.replicas?.toString() ?? '');
    setCpuRequest(model.spec?.computeResources?.requests.cpu ?? '');
    setMemoryRequest(model.spec?.computeResources?.requests.memory ?? '');
    setGpuRequest(model.spec?.computeResources?.requests['nvidia.com/gpu'] ?? '');
    setCpuLimit(model.spec?.computeResources?.limits.cpu ?? '');
    setMemoryLimit(model.spec?.computeResources?.limits.memory ?? '');
    setGpuLimit(model.spec?.computeResources?.limits['nvidia.com/gpu'] ?? '');
    setSelectedClusters(model.spec?.placement?.clusters ?? []);
  }, [model]);

  const saveCapacity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!model?.spec) {
      return;
    }
    const requests: Record<string, string> = {};
    const limits: Record<string, string> = {};
    if (cpuRequest) {
      requests.cpu = cpuRequest;
    }
    if (memoryRequest) {
      requests.memory = memoryRequest;
    }
    if (gpuRequest) {
      requests['nvidia.com/gpu'] = gpuRequest;
    }
    if (cpuLimit) {
      limits.cpu = cpuLimit;
    }
    if (memoryLimit) {
      limits.memory = memoryLimit;
    }
    if (gpuLimit) {
      limits['nvidia.com/gpu'] = gpuLimit;
    }
    const updated = create(ModelSchema, {
      ...model,
      spec: create(ModelSpecSchema, {
        ...model.spec,
        replicas: replicas === '' ? undefined : Number(replicas),
        computeResources: create(ModelComputeResourcesSchema, { requests, limits }),
      }),
    });
    updateModel.mutate({ object: updated, paths: ['spec.replicas', 'spec.compute_resources'] });
  };

  const savePlacement = () => {
    if (!model) {
      return;
    }
    if (!model.spec) {
      return;
    }
    updateModel.mutate({
      object: create(ModelSchema, {
        ...model,
        spec: create(ModelSpecSchema, {
          ...model.spec,
          placement: create(ModelPlacementSchema, { clusters: selectedClusters }),
        }),
      }),
      paths: ['spec.placement'],
    });
  };

  if (isLoading) {
    return <PageSection>{t('Loading model…')}</PageSection>;
  }
  if (error || !model) {
    return (
      <PageSection>
        <Alert variant="danger" title={t('Unable to load model')}>
          {error instanceof Error ? error.message : t('Model was not found.')}
        </Alert>
      </PageSection>
    );
  }

  const source = model.spec?.sourceUri ?? '';
  const currentClusters = model.spec?.placement?.clusters ?? [];

  return (
    <PageSection>
      <Breadcrumb>
        <BreadcrumbItem>
          <Link to="/admin/maas/models">{t('Models')}</Link>
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{model.metadata?.name || model.id}</BreadcrumbItem>
      </Breadcrumb>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1" size="2xl">
            {model.metadata?.annotations?.['openshift.io/display-name'] || model.id}
          </Title>
          <p>
            {t('Overall status')}:{' '}
            {modelPhaseLabel(model.status?.phase ?? ModelPhase.UNSPECIFIED, t)}
          </p>
          {model.status?.message && <p>{model.status.message}</p>}
        </StackItem>
        {updateModel.error && (
          <StackItem>
            <Alert variant="danger" isInline title={t('Model could not be updated')}>
              {updateModel.error.message}
            </Alert>
          </StackItem>
        )}
        {deleteModel.error && (
          <StackItem>
            <Alert variant="danger" isInline title={t('Model could not be deleted')}>
              {deleteModel.error.message}
            </Alert>
          </StackItem>
        )}
        <StackItem>
          <Title headingLevel="h2" size="xl">
            {t('Model configuration')}
          </Title>
          <dl>
            <dt>{t('Model ID')}</dt>
            <dd>{model.id}</dd>
            <dt>{t('Model source')}</dt>
            <dd>{source}</dd>
            <dt>{t('Serving profile')}</dt>
            <dd>{model.spec?.servingProfile || '—'}</dd>
            <dt>{t('Runtime')}</dt>
            <dd>{model.spec?.runtime || t('Selected by serving profile')}</dd>
          </dl>
        </StackItem>
        <StackItem>
          <Title headingLevel="h2" size="xl">
            {t('Inference deployments')}
          </Title>
          {model.status?.deployments.length ? (
            <Table aria-label={t('Inference deployment status')} variant="compact">
              <Thead>
                <Tr>
                  <Th>{t('Cluster')}</Th>
                  <Th>{t('Status')}</Th>
                  <Th>{t('Reason')}</Th>
                  <Th>{t('Message')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {model.status.deployments.map((deployment) => (
                  <Tr key={deployment.cluster}>
                    <Td>{deployment.cluster}</Td>
                    <Td>{deploymentPhaseLabel(deployment.phase, t)}</Td>
                    <Td>{deployment.reason || '—'}</Td>
                    <Td>{deployment.message || '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <p>{t('Deployment status has not been reported yet.')}</p>
          )}
        </StackItem>
        <StackItem>
          <Title headingLevel="h2" size="xl">
            {t('MaaS ingress status')}
          </Title>
          {model.status?.ingress.length ? (
            <Table aria-label={t('MaaS ingress status')} variant="compact">
              <Thead>
                <Tr>
                  <Th>{t('Cluster')}</Th>
                  <Th>{t('Status')}</Th>
                  <Th>{t('Reason')}</Th>
                  <Th>{t('Message')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {model.status.ingress.map((ingress) => (
                  <Tr key={ingress.cluster}>
                    <Td>{ingress.cluster}</Td>
                    <Td>{maasPhaseLabel(ingress.phase, t)}</Td>
                    <Td>{ingress.reason || '—'}</Td>
                    <Td>{ingress.message || '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <p>{t('MaaS ingress status has not been reported yet.')}</p>
          )}
        </StackItem>
        <StackItem>
          <Title headingLevel="h2" size="xl">
            {t('Scale and compute resources')}
          </Title>
          <form onSubmit={saveCapacity}>
            <FormGroup label={t('Replica count')} fieldId="model-detail-replicas">
              <TextInput
                id="model-detail-replicas"
                type="number"
                min={0}
                max={99}
                value={replicas}
                onChange={(_event, value) => setReplicas(value)}
              />
            </FormGroup>
            <FormGroup label={t('CPU request')} fieldId="model-cpu-request">
              <TextInput
                id="model-cpu-request"
                value={cpuRequest}
                onChange={(_event, value) => setCpuRequest(value)}
              />
            </FormGroup>
            <FormGroup label={t('Memory request')} fieldId="model-memory-request">
              <TextInput
                id="model-memory-request"
                value={memoryRequest}
                onChange={(_event, value) => setMemoryRequest(value)}
              />
            </FormGroup>
            <FormGroup label={t('GPU request')} fieldId="model-gpu-request">
              <TextInput
                id="model-gpu-request"
                type="number"
                min={0}
                value={gpuRequest}
                onChange={(_event, value) => setGpuRequest(value)}
              />
            </FormGroup>
            <FormGroup label={t('CPU limit')} fieldId="model-cpu-limit">
              <TextInput
                id="model-cpu-limit"
                value={cpuLimit}
                onChange={(_event, value) => setCpuLimit(value)}
              />
            </FormGroup>
            <FormGroup label={t('Memory limit')} fieldId="model-memory-limit">
              <TextInput
                id="model-memory-limit"
                value={memoryLimit}
                onChange={(_event, value) => setMemoryLimit(value)}
              />
            </FormGroup>
            <FormGroup label={t('GPU limit')} fieldId="model-gpu-limit">
              <TextInput
                id="model-gpu-limit"
                type="number"
                min={0}
                value={gpuLimit}
                onChange={(_event, value) => setGpuLimit(value)}
              />
            </FormGroup>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateModel.isPending}
              isDisabled={updateModel.isPending}
            >
              {t('Save compute settings')}
            </Button>
          </form>
        </StackItem>
        <StackItem>
          <Title headingLevel="h2" size="xl">
            {t('Inference cluster placement')}
          </Title>
          <p>{t('Remove deployments from clusters. At least one deployment must remain.')}</p>
          {currentClusters.map((cluster) => (
            <Checkbox
              key={cluster}
              id={`model-cluster-${cluster}`}
              label={cluster}
              isChecked={selectedClusters.includes(cluster)}
              onChange={(_event, checked) =>
                setSelectedClusters((items) =>
                  checked ? [...items, cluster] : items.filter((item) => item !== cluster),
                )
              }
            />
          ))}
          <div>
            <Button
              variant="secondary"
              onClick={savePlacement}
              isLoading={updateModel.isPending}
              isDisabled={updateModel.isPending || selectedClusters.length === 0}
            >
              {t('Save placement')}
            </Button>
          </div>
        </StackItem>
        <StackItem>
          <Button
            variant="danger"
            onClick={() => setDeleteOpen(true)}
            isDisabled={deleteModel.isPending}
          >
            {t('Delete model')}
          </Button>
        </StackItem>
      </Stack>
      {deleteOpen && (
        <DeleteResourceModal
          resourceName={model.id}
          label={t(
            'The model and all its deployments will be removed. Deletion is blocked while a subscription references this model.',
          )}
          errorLabel={t('Model could not be deleted')}
          onClose={() => setDeleteOpen(false)}
          onSuccess={() => navigate('/admin/maas/models')}
          mutation={deleteModel}
          variables={id}
        />
      )}
    </PageSection>
  );
};
