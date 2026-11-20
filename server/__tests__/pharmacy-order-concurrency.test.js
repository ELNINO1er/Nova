import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execute, notify, getRx } = vi.hoisted(() => ({ execute: vi.fn(), notify: vi.fn(), getRx: vi.fn() }));
vi.mock('../db/database.js', () => ({ pool: { execute } }));
vi.mock('../services/notification.service.js', () => ({ createNotification: notify }));
vi.mock('../services/pharmacy.service.js', () => ({ getPrescriptionForPharmacy: getRx, withPatient: value => value }));
vi.mock('../realtime.js', () => ({ emitToUser: vi.fn() }));
import { updateOrderStatus, getOrdersForPharmacy, getPharmacyOrders, closeOrdersOnDispense } from '../services/pharmacy-order.service.js';

beforeEach(() => vi.resetAllMocks());

describe('pharmacy order race protection', () => {
  it.each(['ready', 'unavailable'])('does not resurrect a concurrently cancelled order as %s', async status => {
    execute.mockResolvedValueOnce([[{ id: 'order', pharmacy_id: 'ph', patient_id: 'patient', prescription_id: 'rx', status: 'pending' }]]);
    if (status === 'ready') execute.mockResolvedValueOnce([[{ status: 'active', valid_until: '2099-01-01' }]]);
    execute.mockResolvedValueOnce([{ affectedRows: 0 }]);
    await expect(updateOrderStatus('ph', 'order', { status, message: 'Rupture' })).rejects.toMatchObject({ status: 409, code: 'order_changed' });
    const [sql, args] = execute.mock.calls.at(-1);
    expect(sql).toContain('AND pharmacy_id = ? AND status = ?');
    expect(args.slice(-3)).toEqual(['order', 'ph', 'pending']);
    expect(notify).not.toHaveBeenCalled();
  });
  it('does not expose prescription detail for a closed order', async () => {
    execute.mockResolvedValueOnce([[{ id: 'order', status: 'cancelled', prescription_id: 'rx', first_name: 'Awa', last_name: 'Fictive' }]]);
    const [order] = await getOrdersForPharmacy('ph');
    expect(order.prescription).toBeNull();
    expect(getRx).not.toHaveBeenCalled();
  });
  it('returns recorded partial dispense and update timestamps to the patient', async () => {
    execute.mockResolvedValueOnce([[{ id: 'order', status: 'pending', last_dispense_status: 'partial', last_dispensed_at: '2026-11-20T10:00:00Z', updated_at: '2026-11-20T10:00:00Z', item_count: '2' }]]);
    expect((await getPharmacyOrders('patient'))[0]).toMatchObject({ lastDispenseStatus: 'partial', lastDispensedAt: '2026-11-20T10:00:00Z', updatedAt: '2026-11-20T10:00:00Z', itemCount: 2 });
    expect(execute.mock.calls[0][1]).toEqual(['patient']);
  });
  it('keeps partial completion inside the caller transaction and scoped to the dispensing pharmacy', async () => {
    const conn = { execute: vi.fn().mockResolvedValueOnce([[{ id: 'order' }]]).mockResolvedValueOnce([{ affectedRows: 1 }]) };
    await closeOrdersOnDispense(conn, { pharmacyId: 'ph', prescriptionId: 'rx', dispenseId: 'dispense', status: 'partial' });
    const [sql, args] = conn.execute.mock.calls[1];
    expect(sql).toContain("SET status = 'pending', dispense_id = ?");
    expect(sql).toContain('WHERE pharmacy_id = ? AND prescription_id = ?');
    expect(args[0]).toBe('dispense');
    expect(args.slice(-2)).toEqual(['ph', 'rx']);
    expect(execute).not.toHaveBeenCalled();
  });
});
