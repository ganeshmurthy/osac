import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Checkbox,
  FormGroup,
  HelperText,
  HelperTextItem,
  PageSection,
  TextInput,
  Title,
} from '@patternfly/react-core';

import { useCreateModel, useModelPlacementClusters } from '../../api/v1/model';
import { useTranslation } from '../../hooks/useTranslation';

export const ModelCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    data: clusters = [],
    isLoading: clustersLoading,
    error: clustersError,
  } = useModelPlacementClusters();
  const createModel = useCreateModel();
  const [name, setName] = useState('');
  const [sourceUri, setSourceUri] = useState('');
  const [servingProfile, setServingProfile] = useState('default');
  const [replicas, setReplicas] = useState('1');
  const [cpuRequest, setCpuRequest] = useState('');
  const [memoryRequest, setMemoryRequest] = useState('');
  const [gpuRequest, setGpuRequest] = useState('');
  const [cpuLimit, setCpuLimit] = useState('');
  const [memoryLimit, setMemoryLimit] = useState('');
  const [gpuLimit, setGpuLimit] = useState('');
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    createModel.mutate(
      {
        id: name,
        metadata: { name },
        spec: {
          sourceUri,
          servingProfile,
          ...(replicas === '' ? {} : { replicas: Number(replicas) }),
          ...(Object.keys(requests).length || Object.keys(limits).length
            ? { computeResources: { requests, limits } }
            : {}),
          placement: { clusters: selectedClusters },
        },
      },
      { onSuccess: (result) => navigate(`/admin/maas/models/${result.id}`) },
    );
  };

  const toggleCluster = (cluster: string, checked: boolean) => {
    setSelectedClusters((current) =>
      checked ? [...current, cluster] : current.filter((name) => name !== cluster),
    );
  };

  return (
    <PageSection>
      <Breadcrumb>
        <BreadcrumbItem>
          <Link to="/admin/maas/models">{t('Models')}</Link>
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{t('Create model')}</BreadcrumbItem>
      </Breadcrumb>
      <Title headingLevel="h1" size="2xl">
        {t('Create model deployment')}
      </Title>
      <form onSubmit={submit}>
        {Boolean(clustersError) && (
          <Alert variant="danger" isInline title={t('Unable to load placement clusters')}>
            {String(clustersError)}
          </Alert>
        )}
        {createModel.error && (
          <Alert variant="danger" isInline title={t('Model could not be created')}>
            {createModel.error.message}
          </Alert>
        )}
        <FormGroup label={t('Model name')} isRequired fieldId="model-name">
          <TextInput
            isRequired
            id="model-name"
            value={name}
            onChange={(_event, value) => setName(value)}
            placeholder={t('for example, granite-3b')}
          />
        </FormGroup>
        <FormGroup label={t('Model source URI')} isRequired fieldId="model-source-uri">
          <TextInput
            isRequired
            id="model-source-uri"
            value={sourceUri}
            onChange={(_event, value) => setSourceUri(value)}
            placeholder="hf://publisher/model"
          />
        </FormGroup>
        <FormGroup label={t('Serving profile')} isRequired fieldId="model-serving-profile">
          <TextInput
            isRequired
            id="model-serving-profile"
            value={servingProfile}
            onChange={(_event, value) => setServingProfile(value)}
          />
          <HelperText>
            <HelperTextItem>
              {t('Enter an AI Grid serving profile name, or use default.')}
            </HelperTextItem>
          </HelperText>
        </FormGroup>
        <FormGroup label={t('Replica count')} fieldId="model-replicas">
          <TextInput
            id="model-replicas"
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
        <FormGroup label={t('Inference clusters')} isRequired fieldId="model-clusters">
          {clustersLoading ? (
            <p>{t('Loading eligible clusters…')}</p>
          ) : clusters.length ? (
            clusters.map((cluster) => (
              <Checkbox
                key={cluster.name}
                id={`placement-${cluster.name}`}
                label={cluster.name}
                isChecked={selectedClusters.includes(cluster.name)}
                onChange={(_event, checked) => toggleCluster(cluster.name, checked)}
              />
            ))
          ) : (
            <p>{t('No eligible AI Grid inference clusters are available.')}</p>
          )}
        </FormGroup>
        <Button
          type="submit"
          variant="primary"
          isDisabled={
            createModel.isPending ||
            !name ||
            !sourceUri ||
            !servingProfile ||
            selectedClusters.length === 0
          }
          isLoading={createModel.isPending}
        >
          {t('Create model')}
        </Button>{' '}
        <Button variant="link" onClick={() => navigate('/admin/maas/models')}>
          {t('Cancel')}
        </Button>
      </form>
    </PageSection>
  );
};
