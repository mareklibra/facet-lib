import React from 'react';
import { useDispatch } from 'react-redux';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import {
  ClusterUpdateParams,
  Disk,
  DiskConfigParams,
  DiskRole as DiskRoleValue,
  Host,
} from '../../api/types';
import { patchCluster } from '../../api/clusters';
import { updateCluster } from '../../features/clusters/currentClusterSlice';
import { getErrorMessage, handleApiError } from '../../api/utils';
import { AlertsContext } from '../AlertsContextProvider';
import { DISK_ROLE_LABELS } from '../../config/constants';

const getCurrentDiskRoleLabel = (disk: Disk, installationDiskPath: Host['installationDiskPath']) =>
  disk.path === installationDiskPath ? DISK_ROLE_LABELS.install : DISK_ROLE_LABELS.none;

type DiskRoleProps = {
  host: Host;
  disk: Disk;
  installationDiskPath: Host['installationDiskPath'];
  isEditable: boolean;
};
const DiskRole: React.FC<DiskRoleProps> = ({ host, disk, installationDiskPath, isEditable }) => {
  if (isEditable && disk.path !== installationDiskPath) {
    return <DiskRoleDropdown host={host} disk={disk} installationDiskPath={installationDiskPath} />;
  }
  return (
    <>{disk.path === installationDiskPath ? DISK_ROLE_LABELS.install : DISK_ROLE_LABELS.none}</>
  );
};

export default DiskRole;

type DiskRoleDropdownProps = {
  host: Host;
  disk: Disk;
  installationDiskPath: Host['installationDiskPath'];
};
const DiskRoleDropdown: React.FC<DiskRoleDropdownProps> = ({
  host,
  disk,
  installationDiskPath,
}) => {
  const [isOpen, setOpen] = React.useState(false);
  const [isDisabled, setDisabled] = React.useState(false);
  const dispatch = useDispatch();
  const { addAlert } = React.useContext(AlertsContext);
  const { id, clusterId } = host;

  const dropdownItems = [
    <DropdownItem
      key="install"
      id="install"
      isDisabled={!disk.installationEligibility?.eligible}
      description={
        !disk.installationEligibility?.eligible && 'Disk is not eligible for installation'
      }
    >
      {DISK_ROLE_LABELS.install}
    </DropdownItem>,
  ];

  const onSelect = React.useCallback(
    (event?: React.SyntheticEvent<HTMLDivElement>) => {
      const setRole = async (role: DiskRoleValue) => {
        setDisabled(true);

        const params: ClusterUpdateParams = {};
        params.disksSelectedConfig = [
          { id, disksConfig: [{ id: disk.path, role } as DiskConfigParams] },
        ];

        try {
          const { data } = await patchCluster(clusterId as string, params);
          dispatch(updateCluster(data));
        } catch (e) {
          handleApiError(e, () =>
            addAlert({ title: 'Failed to set disk role', message: getErrorMessage(e) }),
          );
        }

        setDisabled(false);
      };

      if (event?.currentTarget.id) {
        setRole(event.currentTarget.id as DiskRoleValue);
      }
      setOpen(false);
    },
    [setOpen, addAlert, clusterId, disk.path, dispatch, id],
  );

  const currentRoleLabel = getCurrentDiskRoleLabel(disk, installationDiskPath);
  const toggle = React.useMemo(
    () => (
      <DropdownToggle
        onToggle={(val) => setOpen(val)}
        toggleIndicator={CaretDownIcon}
        isDisabled={isDisabled}
        className="pf-c-button pf-m-link pf-m-inline"
      >
        {currentRoleLabel}
      </DropdownToggle>
    ),
    [setOpen, currentRoleLabel, isDisabled],
  );

  return (
    <Dropdown
      onSelect={onSelect}
      dropdownItems={dropdownItems}
      toggle={toggle}
      isOpen={isOpen}
      isPlain
    />
  );
};
