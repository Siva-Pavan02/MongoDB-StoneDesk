/**
 * Mongoose Data Adapter
 * Provides a drop-in Mongoose-backed data access layer matching the application's
 * query interface, completely eliminating @prisma/client while preserving full
 * MongoDB/Mongoose schema validation, indexes, and document persistence.
 */
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./db');
const models = require('../models');

function normalizeId(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(normalizeId);
  const json = obj.toObject ? obj.toObject({ virtuals: true }) : { ...obj };
  if (json._id && !json.id) json.id = json._id;
  return json;
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mapSelect(select) {
  if (!select || typeof select !== 'object') return null;
  const projection = {};
  for (const [k, v] of Object.entries(select)) {
    if (v === true) {
      if (k === 'id') projection._id = 1;
      else projection[k] = 1;
    }
  }
  return Object.keys(projection).length ? projection : null;
}

function mapWhere(where = {}) {
  const query = {};
  for (const [key, val] of Object.entries(where)) {
    if (key === 'id') {
      query._id = val;
    } else if (key === 'OR' && Array.isArray(val)) {
      query.$or = val.map(mapWhere);
    } else if (val && typeof val === 'object' && !(val instanceof Date)) {
      if (val.in !== undefined) query[key] = { $in: val.in };
      else if (val.notIn !== undefined) query[key] = { $nin: val.notIn };
      else if (val.not !== undefined) query[key] = { $ne: val.not };
      else if (val.gt !== undefined) query[key] = { $gt: val.gt };
      else if (val.gte !== undefined) query[key] = { $gte: val.gte };
      else if (val.lt !== undefined) query[key] = { $lt: val.lt };
      else if (val.lte !== undefined) query[key] = { $lte: val.lte };
      else if (val.contains !== undefined) {
        query[key] = { $regex: escapeRegex(val.contains), $options: val.mode === 'insensitive' ? 'i' : '' };
      } else if (Array.isArray(val.path) && (val.string_contains !== undefined || val.contains !== undefined)) {
        const target = val.string_contains !== undefined ? val.string_contains : val.contains;
        query[`${key}.${val.path.join('.')}`] = { $regex: escapeRegex(target), $options: 'i' };
      } else {
        query[key] = val;
      }
    } else {
      query[key] = val;
    }
  }
  return query;
}

function mapData(data = {}) {
  const update = {};
  const set = {};
  const inc = {};
  const push = {};

  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.increment !== undefined) {
        inc[key] = val.increment;
      } else if (val.set !== undefined) {
        set[key] = val.set;
      } else if (val.push !== undefined) {
        push[key] = val.push;
      } else {
        set[key] = val;
      }
    } else {
      set[key] = val;
    }
  }

  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(inc).length) update.$inc = inc;
  if (Object.keys(push).length) update.$push = push;
  return update;
}

function createModelAdapter(Model) {
  return {
    async findUnique({ where, select, include }) {
      let q = Model.findOne(mapWhere(where));
      if (select) {
        const proj = mapSelect(select);
        if (proj) q = q.select(proj).lean();
      }
      const doc = await q;
      if (!doc) return null;
      let result = normalizeId(doc);
      if (include?.createdByUser || select?.createdByUser) {
        if (result.createdByUserId) {
          const user = await models.User.findById(result.createdByUserId).select('name email');
          result.createdByUser = user ? { name: user.name, email: user.email } : null;
        }
      }
      if (include?.user || select?.user) {
        if (result.userId) {
          const user = await models.User.findById(result.userId);
          result.user = user ? normalizeId(user) : null;
        }
      }
      if (select?._count?.select?.payments || include?._count?.select?.payments) {
        const count = await models.InvoicePayment.countDocuments({ dispatchId: result.id, organizationId: result.organizationId });
        result._count = { payments: count };
      }
      return result;
    },

    async findUniqueOrThrow(args) {
      const res = await this.findUnique(args);
      if (!res) throw Object.assign(new Error('Record not found'), { status: 404 });
      return res;
    },

    async findFirst({ where, select, orderBy, include } = {}) {
      let q = Model.findOne(mapWhere(where));
      if (select) {
        const proj = mapSelect(select);
        if (proj) q = q.select(proj).lean();
      }
      if (orderBy) {
        const sort = {};
        if (Array.isArray(orderBy)) {
          for (const item of orderBy) Object.assign(sort, item);
        } else {
          Object.assign(sort, orderBy);
        }
        q = q.sort(sort);
      }
      const doc = await q;
      if (!doc) return null;
      let result = normalizeId(doc);
      if (include?.user || select?.user) {
        if (result.userId) {
          const user = await models.User.findById(result.userId);
          result.user = user ? normalizeId(user) : null;
        }
      }
      if (select?._count?.select?.payments || include?._count?.select?.payments) {
        const count = await models.InvoicePayment.countDocuments({ dispatchId: result.id, organizationId: result.organizationId });
        result._count = { payments: count };
      }
      return result;
    },

    async findMany({ where, select, orderBy, take, skip, cursor } = {}) {
      let filter = mapWhere(where);
      let effectiveSkip = skip || 0;

      if (cursor?.id) {
        const cursorDoc = await Model.findById(cursor.id);
        if (cursorDoc) {
          const sortOrder = Array.isArray(orderBy) ? orderBy[0] : (orderBy || { createdAt: 'desc' });
          const sortField = Object.keys(sortOrder)[0] || 'createdAt';
          const isAsc = sortOrder[sortField] === 'asc';
          const sortOp = isAsc ? '$gt' : '$lt';
          const cursorVal = cursorDoc[sortField];
          
          if (cursorVal !== undefined && cursorVal !== null) {
            const cursorCond = {
              $or: [
                { [sortField]: { [sortOp]: cursorVal } },
                { [sortField]: cursorVal, _id: { [sortOp]: cursor.id } }
              ]
            };
            if (filter.$and) {
              filter.$and.push(cursorCond);
            } else if (Object.keys(filter).length > 0) {
              filter = { $and: [filter, cursorCond] };
            } else {
              filter = cursorCond;
            }
            effectiveSkip = Math.max(0, effectiveSkip - 1);
          }
        }
      }

      let q = Model.find(filter);
      if (select) {
        const proj = mapSelect(select);
        if (proj) q = q.select(proj).lean();
      }
      if (orderBy) {
        const sort = {};
        if (Array.isArray(orderBy)) {
          for (const item of orderBy) Object.assign(sort, item);
        } else {
          Object.assign(sort, orderBy);
        }
        q = q.sort(sort);
      }
      if (effectiveSkip) q = q.skip(effectiveSkip);
      if (take) q = q.limit(take);

      const docs = await q;
      const list = docs.map(normalizeId);

      // Handle relations if needed
      for (const item of list) {
        if (item.createdByUserId && !item.createdByUser) {
          const u = await models.User.findById(item.createdByUserId).select('name');
          if (u) item.createdByUser = { name: u.name };
        }
      }

      return list;
    },

    async create({ data, include }) {
      const payload = { ...data };
      if (payload.organization?.create) {
        const orgData = payload.organization.create;
        delete payload.organization;
        const org = await models.MasterSettings.create(orgData);
        payload.organizationId = org._id || org.id;
      }
      if (payload.id && !payload._id) payload._id = payload.id;
      const doc = await Model.create(payload);
      let result = normalizeId(doc);
      if (include?.createdByUser && result.createdByUserId) {
        const user = await models.User.findById(result.createdByUserId).select('name');
        result.createdByUser = user ? { name: user.name } : null;
      }
      return result;
    },

    async createMany({ data }) {
      if (!Array.isArray(data) || !data.length) return { count: 0 };
      const payloads = data.map(item => {
        const payload = { ...item };
        if (payload.id && !payload._id) payload._id = payload.id;
        return payload;
      });
      const docs = await Model.insertMany(payloads);
      return { count: docs.length };
    },

    async update({ where, data }) {
      const updateOps = mapData(data);
      const doc = await Model.findOneAndUpdate(mapWhere(where), updateOps, { new: true });
      return normalizeId(doc);
    },

    async updateMany({ where, data }) {
      const updateOps = mapData(data);
      const res = await Model.updateMany(mapWhere(where), updateOps);
      return { count: res.modifiedCount };
    },

    async delete({ where }) {
      const filter = mapWhere(where);
      if (Model === models.Dispatch) {
        const id = filter._id || filter.id;
        if (id) {
          const hasPayments = await models.InvoicePayment.countDocuments({ dispatchId: id });
          if (hasPayments > 0) {
            const err = new Error('Foreign key constraint violated on InvoicePayment');
            err.code = 'P2003';
            throw err;
          }
        }
      }
      const doc = await Model.findOneAndDelete(filter);
      return normalizeId(doc);
    },

    async deleteMany({ where = {} }) {
      const res = await Model.deleteMany(mapWhere(where));
      return { count: res.deletedCount };
    },

    async count({ where = {} } = {}) {
      return Model.countDocuments(mapWhere(where));
    }
  };
}

let txLock = Promise.resolve();

const adapter = {
  $connect: connectDB,
  $disconnect: disconnectDB,
  $transaction: async (fn) => {
    if (Array.isArray(fn)) {
      return Promise.all(fn);
    }
    const prevLock = txLock;
    let release;
    txLock = new Promise(resolve => { release = resolve; });
    await prevLock;
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      const res = await fn(adapter);
      await session.commitTransaction();
      return res;
    } catch (err) {
      if (session) {
        try { await session.abortTransaction(); } catch (_) {}
      }
      if (err.message && err.message.includes('replica set')) {
        return fn(adapter);
      }
      throw err;
    } finally {
      if (session) session.endSession();
      release();
    }
  },

  user: createModelAdapter(models.User),
  masterSettings: createModelAdapter(models.MasterSettings),
  dispatch: createModelAdapter(models.Dispatch),
  loadingList: createModelAdapter(models.LoadingList),
  invoicePayment: createModelAdapter(models.InvoicePayment),
  session: createModelAdapter(models.Session),
  invitation: createModelAdapter(models.Invitation),
  passwordResetToken: createModelAdapter(models.PasswordResetToken),
  auditLog: createModelAdapter(models.AuditLog),

  // Export raw Mongoose models for direct modern usage
  models
};

module.exports = adapter;
