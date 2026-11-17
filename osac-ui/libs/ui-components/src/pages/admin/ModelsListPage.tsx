import { Link, useNavigate } from 'react-router-dom';
import { Button, Label } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import type { TFunction } from 'i18next';

import { ModelPhase } from '@osac/types';

import { useModels } from '../../api/v1/model';
import ListPage from '../../components/Page/ListPage';
import ListPageBody from '../../components/Page/ListPageBody';
import { SubtleContent } from '../../components/SubtleContent/SubtleContent';
import { useTranslation } from '../../hooks/useTranslation';

const phaseLabel = (phase: ModelPhase, t: TFunction): string => {
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

export const ModelsListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: models = [], isLoading, error } = useModels();

  return (
    <ListPage
      title={t('Models')}
      description={t('Manage local MaaS model deployments on AI Grid inference clusters.')}
      actions={
        <Button variant="primary" onClick={() => navigate('/admin/maas/models/create')}>
          {t('Deploy Model')}
        </Button>
      }
    >
      <ListPageBody isLoading={isLoading} error={error}>
        {!models.length ? (
          <SubtleContent component="p">
            {t('No models yet. Create a model deployment to make it available through MaaS.')}
          </SubtleContent>
        ) : (
          <Table aria-label={t('MaaS models')} variant="compact">
            <Thead>
              <Tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Status')}</Th>
                <Th>{t('Inference clusters')}</Th>
                <Th>{t('Serving profile')}</Th>
                <Th>{t('Model source')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {models.map((model) => (
                <Tr key={model.id}>
                  <Td dataLabel={t('Name')}>
                    <Link to={`/admin/maas/models/${model.id}`}>
                      {model.metadata?.annotations?.['openshift.io/display-name'] || model.id}
                    </Link>
                  </Td>
                  <Td dataLabel={t('Status')}>
                    <Label isCompact>
                      {phaseLabel(model.status?.phase ?? ModelPhase.UNSPECIFIED, t)}
                    </Label>
                  </Td>
                  <Td dataLabel={t('Inference clusters')}>
                    {model.spec?.placement?.clusters.join(', ') || '—'}
                  </Td>
                  <Td dataLabel={t('Serving profile')}>{model.spec?.servingProfile || '—'}</Td>
                  <Td dataLabel={t('Model source')}>{model.spec?.sourceUri || '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </ListPageBody>
    </ListPage>
  );
};
