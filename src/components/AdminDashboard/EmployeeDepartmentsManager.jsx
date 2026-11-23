import React, { useEffect, useRef, useState } from 'react';
import { Edit3, GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PermissionGate from '@/components/PermissionGate';
import { usePermissionContext } from '@/contexts/PermissionContext';
import {
  createEmployeeDepartment,
  createEmployeePosition,
  deleteEmployeeDirectoryItem,
  persistEmployeePositionLayout,
  renameEmployeeDirectoryItem,
  reorderEmployeeDirectoryItems,
} from '@/lib/storage/employeeStorage';
import { useToast } from '@/components/ui/use-toast';

const cloneHierarchy = (departments) => (departments || []).map((department) => ({
  ...department,
  positions: [...(department.positions || [])],
}));

const getHierarchySignature = (departments) => (departments || [])
  .map((department) => `${department.id}:${(department.positions || []).map((position) => position.id).join(',')}`)
  .join('|');

const moveDepartmentBefore = (departments, movingId, targetId) => {
  if (!movingId || !targetId || movingId === targetId) return departments;
  const nextDepartments = cloneHierarchy(departments);
  const movingIndex = nextDepartments.findIndex((department) => department.id === movingId);
  if (movingIndex < 0) return departments;
  const [movingDepartment] = nextDepartments.splice(movingIndex, 1);
  const targetIndex = nextDepartments.findIndex((department) => department.id === targetId);
  if (targetIndex < 0) return departments;
  nextDepartments.splice(targetIndex, 0, movingDepartment);
  return nextDepartments;
};

const movePositionBefore = (departments, movingId, targetDepartmentId, targetPositionId = null) => {
  if (!movingId || !targetDepartmentId || movingId === targetPositionId) return departments;
  const nextDepartments = cloneHierarchy(departments);
  let movingPosition = null;

  nextDepartments.forEach((department) => {
    const positionIndex = department.positions.findIndex((position) => position.id === movingId);
    if (positionIndex >= 0) {
      [movingPosition] = department.positions.splice(positionIndex, 1);
    }
  });

  const targetDepartment = nextDepartments.find((department) => department.id === targetDepartmentId);
  if (!movingPosition || !targetDepartment) return departments;

  const targetIndex = targetPositionId
    ? targetDepartment.positions.findIndex((position) => position.id === targetPositionId)
    : targetDepartment.positions.length;
  const safeTargetIndex = targetIndex < 0 ? targetDepartment.positions.length : targetIndex;

  targetDepartment.positions.splice(safeTargetIndex, 0, {
    ...movingPosition,
    department_id: targetDepartmentId,
  });
  return nextDepartments;
};

const EmployeeDepartmentsManager = ({ departments, onRefresh }) => {
  const { toast } = useToast();
  const { hasPerm, hasUiRoles, isSuperadmin } = usePermissionContext();
  const canManage = isSuperadmin || !hasUiRoles || hasPerm('employees.create');
  const dropCommittedRef = useRef(false);
  const orderedDepartmentsRef = useRef(cloneHierarchy(departments));
  const dragStartHierarchyRef = useRef(cloneHierarchy(departments));
  const [orderedDepartments, setOrderedDepartments] = useState(() => orderedDepartmentsRef.current);
  const [dialog, setDialog] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [activeDropDepartmentId, setActiveDropDepartmentId] = useState(null);

  useEffect(() => {
    if (!dragState && !savingOrder && !hasUnsavedChanges) {
      const nextHierarchy = cloneHierarchy(departments);
      orderedDepartmentsRef.current = nextHierarchy;
      setOrderedDepartments(nextHierarchy);
    }
  }, [departments, dragState, hasUnsavedChanges, savingOrder]);

  const openDialog = (nextDialog) => {
    if (hasUnsavedChanges) {
      toast({ title: 'Unsaved Arrangement', description: 'Save or discard the hierarchy changes before editing departments or positions.' });
      return;
    }
    setDialog(nextDialog);
    setName(nextDialog?.name || '');
  };

  const closeDialog = () => {
    setDialog(null);
    setName('');
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (dialog.mode === 'create-department') {
        await createEmployeeDepartment(name);
      } else if (dialog.mode === 'create-position') {
        await createEmployeePosition(dialog.departmentId, name);
      } else {
        await renameEmployeeDirectoryItem(dialog.type, dialog.id, name);
      }
      await onRefresh();
      toast({ title: 'Hierarchy Updated', description: 'The employee directory and dropdowns are now up to date.' });
      closeDialog();
    } catch (error) {
      toast({ title: 'Unable to Save', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, item) => {
    if (hasUnsavedChanges) {
      toast({ title: 'Unsaved Arrangement', description: 'Save or discard the hierarchy changes before deleting an item.' });
      return;
    }
    const noun = type === 'department' ? 'department and its nested positions' : 'position';
    if (!window.confirm(`Delete ${item.name}? This removes the ${noun}, but does not delete employees.`)) return;
    try {
      await deleteEmployeeDirectoryItem(type, item.id);
      await onRefresh();
      toast({ title: 'Item Removed', description: `${item.name} was removed from the hierarchy.` });
    } catch (error) {
      toast({ title: 'Unable to Delete', description: error.message, variant: 'destructive' });
    }
  };

  const startDrag = (event, item) => {
    if (!canManage || savingOrder) {
      event.preventDefault();
      return;
    }
    dropCommittedRef.current = false;
    dragStartHierarchyRef.current = cloneHierarchy(orderedDepartmentsRef.current);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${item.type}:${item.id}`);
    setDragState(item);
  };

  const dragDepartmentOver = (event, departmentId) => {
    if (dragState?.type === 'department') {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setOrderedDepartments((current) => {
        const nextHierarchy = moveDepartmentBefore(current, dragState.id, departmentId);
        orderedDepartmentsRef.current = nextHierarchy;
        return nextHierarchy;
      });
      return;
    }

    if (dragState?.type === 'position') {
      dragPositionOver(event, departmentId);
    }
  };

  const dragPositionOver = (event, departmentId, positionId = null) => {
    if (dragState?.type !== 'position') return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setActiveDropDepartmentId(departmentId);
    setOrderedDepartments((current) => {
      const nextHierarchy = movePositionBefore(current, dragState.id, departmentId, positionId);
      orderedDepartmentsRef.current = nextHierarchy;
      return nextHierarchy;
    });
  };

  const commitDragDraft = (event) => {
    if (!dragState) return;
    event.preventDefault();
    event.stopPropagation();
    dropCommittedRef.current = true;
    setDragState(null);
    setActiveDropDepartmentId(null);
    setHasUnsavedChanges(
      getHierarchySignature(orderedDepartmentsRef.current) !== getHierarchySignature(departments)
    );
  };

  const saveArrangement = async () => {
    const nextHierarchy = cloneHierarchy(orderedDepartmentsRef.current);
    setSavingOrder(true);
    try {
      await reorderEmployeeDirectoryItems('department', nextHierarchy);
      await persistEmployeePositionLayout(nextHierarchy);
      setHasUnsavedChanges(false);
      await onRefresh();
      toast({
        title: 'Arrangement Saved',
        description: 'The new hierarchy is saved and reflected in employee forms.',
      });
    } catch (error) {
      toast({ title: 'Unable to Save Order', description: error.message, variant: 'destructive' });
    } finally {
      setSavingOrder(false);
    }
  };

  const discardArrangement = () => {
    const savedHierarchy = cloneHierarchy(departments);
    orderedDepartmentsRef.current = savedHierarchy;
    setOrderedDepartments(savedHierarchy);
    setHasUnsavedChanges(false);
    setDragState(null);
    setActiveDropDepartmentId(null);
  };

  const finishDrag = () => {
    if (!dropCommittedRef.current) {
      const preDragHierarchy = cloneHierarchy(dragStartHierarchyRef.current);
      orderedDepartmentsRef.current = preDragHierarchy;
      setOrderedDepartments(preDragHierarchy);
    }
    dropCommittedRef.current = false;
    setDragState(null);
    setActiveDropDepartmentId(null);
  };

  return (
    <div className={`space-y-5 ${hasUnsavedChanges ? 'pb-24' : ''}`}>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Department hierarchy</h2>
          <p className="mt-1 text-sm text-slate-500">Drag departments to reorder them. Drag any position into another department to move it.</p>
        </div>
        <PermissionGate permission="employees.create">
          <Button type="button" onClick={() => openDialog({ mode: 'create-department' })} disabled={hasUnsavedChanges || savingOrder}>
            <Plus className="mr-2 h-4 w-4" /> Add Department
          </Button>
        </PermissionGate>
      </div>

      {orderedDepartments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
          No departments yet. Add the first department to start organizing employees.
        </div>
      ) : (
        <div className="space-y-4">
          {orderedDepartments.map((department) => (
            <section
              key={department.id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${dragState?.type === 'department' && dragState.id === department.id ? 'opacity-50' : ''} ${activeDropDepartmentId === department.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}
              onDragOver={(event) => dragDepartmentOver(event, department.id)}
              onDrop={commitDragDraft}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  {canManage && (
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => startDrag(event, { type: 'department', id: department.id })}
                      onDragEnd={finishDrag}
                      className="cursor-grab rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-blue-600 active:cursor-grabbing"
                      aria-label={`Drag ${department.name} department`}
                      title="Drag to reorder department"
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-950">{department.name}</h3>
                    <p className="text-xs text-slate-500">{department.positions.length} nested position{department.positions.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <PermissionGate permission="employees.create">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" disabled={hasUnsavedChanges || savingOrder} onClick={() => openDialog({ mode: 'edit', type: 'department', id: department.id, name: department.name })} aria-label={`Rename ${department.name}`}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={hasUnsavedChanges || savingOrder} className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete('department', department)} aria-label={`Delete ${department.name}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </PermissionGate>
              </div>

              <div className="p-4 sm:p-5">
                <div
                  className={`ml-3 min-h-16 space-y-2 border-l-2 pl-4 transition ${activeDropDepartmentId === department.id ? 'border-blue-400 bg-blue-50/40' : 'border-blue-100'}`}
                  onDragOver={(event) => dragPositionOver(event, department.id)}
                  onDrop={commitDragDraft}
                >
                  {department.positions.map((position) => (
                    <div
                      key={position.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-3 transition ${dragState?.type === 'position' && dragState.id === position.id ? 'border-blue-300 opacity-50' : 'border-slate-100'}`}
                      onDragOver={(event) => dragPositionOver(event, department.id, position.id)}
                      onDrop={commitDragDraft}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {canManage && (
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) => startDrag(event, { type: 'position', id: position.id })}
                            onDragEnd={finishDrag}
                            className="cursor-grab rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-blue-600 active:cursor-grabbing"
                            aria-label={`Drag ${position.name} position`}
                            title="Drag to reorder or move to another department"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        )}
                        <span className="truncate text-sm font-semibold text-slate-700">{position.name}</span>
                      </div>
                      <PermissionGate permission="employees.create">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" disabled={hasUnsavedChanges || savingOrder} className="h-8 w-8" onClick={() => openDialog({ mode: 'edit', type: 'position', id: position.id, name: position.name })} aria-label={`Rename ${position.name}`}><Edit3 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" disabled={hasUnsavedChanges || savingOrder} className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete('position', position)} aria-label={`Delete ${position.name}`}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </PermissionGate>
                    </div>
                  ))}
                  {dragState?.type === 'position' && department.positions.length === 0 && (
                    <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4 text-center text-sm font-medium text-blue-700">Drop position here</div>
                  )}
                  <PermissionGate permission="employees.create">
                    <Button type="button" variant="outline" size="sm" disabled={hasUnsavedChanges || savingOrder} className="mt-2 border-dashed text-blue-700" onClick={() => openDialog({ mode: 'create-position', departmentId: department.id, departmentName: department.name })}>
                      <Plus className="mr-2 h-4 w-4" /> Add Position
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-col gap-3 rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between" role="region" aria-label="Unsaved hierarchy changes">
          <div>
            <p className="font-semibold text-slate-950">Unsaved arrangement</p>
            <p className="text-sm text-slate-500">Review the hierarchy, then save when you are ready.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" onClick={discardArrangement} disabled={savingOrder}>Discard</Button>
            <Button type="button" onClick={saveArrangement} disabled={savingOrder}>
              <Save className="mr-2 h-4 w-4" /> {savingOrder ? 'Saving...' : 'Save Arrangement'}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === 'create-department' ? 'Add Department' : dialog?.mode === 'create-position' ? 'Add Position' : 'Rename Item'}</DialogTitle>
            <DialogDescription>{dialog?.mode === 'create-position' ? `This position will be nested under ${dialog.departmentName}.` : 'This order and label will be used throughout the employee directory.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="employee-directory-name">Name</Label>
            <Input id="employee-directory-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus onKeyDown={(event) => event.key === 'Enter' && handleSave()} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving || !name.trim()}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeDepartmentsManager;
