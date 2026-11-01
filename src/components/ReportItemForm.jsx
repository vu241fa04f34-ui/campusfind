import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  EyeOff,
  Gift
} from 'lucide-react';
import {
  CATEGORIES,
  CAMPUS_LOCATIONS,
  BLOCK_FLOORS,
  isBlockLocation,
  validateItemForm,
  checkSensitiveInfoWarning,
  validateImageFile
} from '../utils/validation';
import { LocationSelect } from './LocationSelect';
import { itemService } from '../services/itemService';
import { useAuth } from '../hooks/useAuth';

// Date helper outside render to guarantee purity
const getTodayString = () => new Date().toISOString().split('T')[0];

export function ReportItemForm({ initialType = 'lost', onCancel }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    type: initialType === 'found' ? 'found' : 'lost',
    category: 'Electronics',
    location: CAMPUS_LOCATIONS[0],
    floor: '',
    roomNumber: '',
    locationDescription: '',
    features: '',
    privateVerificationClue: '',
    rewardNote: '',
    eventDate: getTodayString(),
    description: '',
  });

  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Live duplicate detection as user types title
  useEffect(() => {
    if (!formData.title || formData.title.trim().length < 4) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const existing = await itemService.getItems({ category: formData.category });
        const tokens = formData.title.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
        
        const match = existing.find((item) => {
          if (item.category !== formData.category) return false;
          const targetTitle = (item.title || '').toLowerCase();
          const targetTokens = targetTitle.split(/\s+/);
          const overlap = tokens.filter((t) => targetTokens.includes(t));
          return overlap.length >= 2 || (tokens.length === 1 && targetTokens.includes(tokens[0]));
        });

        if (match) {
          setDuplicateWarning({
            id: match.id,
            title: match.title,
            type: match.type,
            location: match.location
          });
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // Silently ignore duplicate check error
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.title, formData.category]);

  const isBlock = isBlockLocation(formData.location);
  const blockFloors = isBlock ? (BLOCK_FLOORS[formData.location] || []) : [];

  const handleLocationChange = (newLoc) => {
    setFormData((prev) => {
      const isNewBlock = isBlockLocation(newLoc);

      // If switching to a non-block location, clear floor and room
      if (!isNewBlock) {
        return {
          ...prev,
          location: newLoc,
          floor: '',
          roomNumber: ''
        };
      }

      // If switching from one block to another block, clear previous block's floor and room
      if (prev.location !== newLoc) {
        return {
          ...prev,
          location: newLoc,
          floor: '',
          roomNumber: ''
        };
      }

      return { ...prev, location: newLoc };
    });

    setErrors((prev) => ({
      ...prev,
      location: null,
      floor: null,
      roomNumber: null
    }));
  };

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [sensitiveWarning, setSensitiveWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time check for sensitive text in description
    if (name === 'description') {
      const warning = checkSensitiveInfoWarning(value);
      setSensitiveWarning(warning);
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleTypeSelect = (type) => {
    setFormData((prev) => ({ ...prev, type }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, image: validation.error }));
      return;
    }

    setErrors((prev) => ({ ...prev, image: null }));
    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrors((prev) => ({
      ...prev,
      image: 'Please upload an item photo before submitting your report.'
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    // Form and mandatory photo validation
    const validation = validateItemForm(formData, imageFile);
    if (!validation.isValid) {
      setErrors(validation.errors);
      if (validation.errors.image) {
        setServerError('Please upload an item photo before submitting your report.');
        const section = document.getElementById('photo-upload-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    if (!imageFile && !formData.imageUrl) {
      setErrors((prev) => ({
        ...prev,
        image: 'Please upload an item photo before submitting your report.'
      }));
      setServerError('Please upload an item photo before submitting your report.');
      const section = document.getElementById('photo-upload-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    try {
      const created = await itemService.createItem(formData, imageFile, currentUser);
      setSuccess(true);
      setTimeout(() => {
        navigate(`/item/${created.id}`);
      }, 1200);
    } catch (err) {
      console.error('Error submitting report:', err);
      setServerError(
        err.message || 'Failed to submit report. Please check your network connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Submission Failed</p>
            <p className="text-xs text-rose-600 mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-semibold">Listing Published Successfully!</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Redirecting to item details page...
            </p>
          </div>
        </div>
      )}

      {/* Report Type Selector */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          What are you reporting? <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleTypeSelect('lost')}
            className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition flex items-center justify-center gap-2 ${
              formData.type === 'lost'
                ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm ring-2 ring-rose-500/20'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>I Lost an Item</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSelect('found')}
            className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition flex items-center justify-center gap-2 ${
              formData.type === 'found'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>I Found an Item</span>
          </button>
        </div>
        {errors.type && <p className="text-xs text-rose-600 mt-1">{errors.type}</p>}
      </div>

      {/* Item Title */}
      <div>
        <label htmlFor="item-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Item Title <span className="text-rose-500">*</span>
        </label>
        <input
          id="item-title"
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Blue Hydro Flask 32oz, AirPods Pro in white case"
          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
            errors.title ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'
          }`}
        />
        {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}

        {/* Live Duplicate Warning */}
        {duplicateWarning && (
          <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Possible similar item already reported:</p>
              <p className="text-amber-800 mt-0.5">
                "{duplicateWarning.title}" ({duplicateWarning.type}) at {duplicateWarning.location}.
              </p>
              <a
                href={`/item/${duplicateWarning.id}`}
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold text-emerald-700 hover:text-emerald-800 mt-1 inline-block"
              >
                Inspect existing listing in a new tab &rarr;
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Category & Location Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="item-category" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Category <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="item-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="item-location" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Campus Location <span className="text-rose-500">*</span>
          </label>
          <LocationSelect
            id="item-location"
            value={formData.location}
            onChange={handleLocationChange}
            error={errors.location}
          />
        </div>
      </div>

      {/* When Location is Other, specify description */}
      {formData.location === 'Other' && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-in fade-in">
          <label htmlFor="item-location-desc" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Specify Location Description <span className="text-rose-500">*</span>
          </label>
          <input
            id="item-location-desc"
            type="text"
            name="locationDescription"
            value={formData.locationDescription}
            onChange={handleChange}
            placeholder="e.g. Near Central ATM booth, Chemistry Lab corridor, North car parking"
            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      )}

      {/* Conditional Floor and Room Number for Block Locations */}
      {isBlock && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/90 animate-in fade-in duration-200">
          <div>
            <label htmlFor="item-floor" className="block text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1.5">
              Floor in {formData.location} <span className="text-rose-500">*</span>
            </label>
            <select
              id="item-floor"
              name="floor"
              value={formData.floor}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 bg-white border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer ${
                errors.floor ? 'border-rose-400' : 'border-emerald-300 focus:border-emerald-500'
              }`}
            >
              <option value="">Select Floor...</option>
              {blockFloors.map((fl) => (
                <option key={fl} value={fl}>
                  {fl}
                </option>
              ))}
            </select>
            {errors.floor && <p className="text-xs text-rose-600 mt-1">{errors.floor}</p>}
          </div>

          <div>
            <label htmlFor="item-room" className="block text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1.5">
              Room Number / Lab <span className="text-rose-500">*</span>
            </label>
            <input
              id="item-room"
              type="text"
              name="roomNumber"
              value={formData.roomNumber}
              onChange={handleChange}
              placeholder="e.g. 101, 204, or Lab-2"
              className={`w-full px-4 py-2.5 bg-white border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                errors.roomNumber ? 'border-rose-400' : 'border-emerald-300 focus:border-emerald-500'
              }`}
            />
            {errors.roomNumber && <p className="text-xs text-rose-600 mt-1">{errors.roomNumber}</p>}
          </div>
        </div>
      )}

      {/* Date Lost or Found */}
      <div>
        <label htmlFor="item-date" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Date {formData.type === 'found' ? 'Found' : 'Lost'} <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            id="item-date"
            type="date"
            name="eventDate"
            max={getTodayString()}
            value={formData.eventDate}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              errors.eventDate ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'
            }`}
          />
        </div>
        {errors.eventDate && <p className="text-xs text-rose-600 mt-1">{errors.eventDate}</p>}
      </div>

      {/* Distinguishing Features */}
      <div>
        <label htmlFor="item-features" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Distinguishing Features (Optional)
        </label>
        <input
          id="item-features"
          type="text"
          name="features"
          value={formData.features}
          onChange={handleChange}
          placeholder="e.g. Matte finish, blue sticker on lid, scratched bezel, serial prefix"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Helps our intelligent campus matching engine compare against found belongings.
        </p>
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="item-description" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Description &amp; Identifying Details <span className="text-rose-500">*</span>
          </label>
          <span className="text-[11px] text-slate-400">{formData.description.length} / 1500</span>
        </div>
        <textarea
          id="item-description"
          name="description"
          rows={4}
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe color, brand, condition, or general features. Keep at least one unique detail private to verify claims."
          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
            errors.description ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'
          }`}
        />
        {errors.description && <p className="text-xs text-rose-600 mt-1">{errors.description}</p>}

        {/* Sensitive information warning banner */}
        {sensitiveWarning && (
          <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <span>{sensitiveWarning}</span>
          </div>
        )}
      </div>

      {/* Private Ownership Verification Clue */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-800 text-xs font-bold uppercase tracking-wider">
          <EyeOff className="w-3.5 h-3.5 text-emerald-600" />
          <span>Private Ownership Verification Clue (Optional)</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          A secret identifier (like phone wallpaper, unique key charm, or inner serial) hidden from public listings. You will use this to verify claimant answers.
        </p>
        <input
          id="item-secret-clue"
          type="text"
          name="privateVerificationClue"
          value={formData.privateVerificationClue}
          onChange={handleChange}
          placeholder="e.g. Lockscreen photo is a mountain sunrise, or keychain has '2024' inscribed"
          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* Optional Reward Note for Lost items */}
      {formData.type === 'lost' && (
        <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 flex items-start gap-2.5">
          <Gift className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <label htmlFor="item-reward" className="block text-xs font-bold uppercase tracking-wider text-emerald-900">
              Optional Reward / Finder Gratitude Note
            </label>
            <input
              id="item-reward"
              type="text"
              name="rewardNote"
              value={formData.rewardNote}
              onChange={handleChange}
              placeholder="e.g. Free coffee treat or heartfelt appreciation for safe return!"
              className="w-full px-3.5 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Photo Upload (Compulsory) */}
      <div id="photo-upload-section">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
          Upload Item Photo (Required) <span className="text-rose-500">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Please upload a clear photo of the lost or found item. Supported formats: JPG, JPEG, PNG, WebP (up to 5 MB).
        </p>

        {imagePreview ? (
          <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 max-w-sm shadow-md bg-slate-900 group">
            <img
              src={imagePreview}
              alt="Selected item photo preview"
              className="w-full h-52 object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2 left-3 text-white text-[11px] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="truncate max-w-[220px]">
                {imageFile?.name || 'Photo selected'}
              </span>
            </div>
            <button
              type="button"
              onClick={removeImage}
              disabled={submitting}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition shadow-md cursor-pointer"
              title="Remove photo and upload another"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => !submitting && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center group ${
              errors.image
                ? 'border-rose-400 bg-rose-50/50 hover:bg-rose-50/80'
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition ${
                errors.image
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700'
              }`}
            >
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-emerald-800">
              Click to select or drag and drop an item photo
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Required for all Lost and Found reports • JPG, PNG, WebP up to 5 MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleImageChange}
          disabled={submitting}
          className="hidden"
        />
        {errors.image && (
          <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errors.image}</span>
          </p>
        )}
      </div>

      {/* Security notice */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Security Note:</strong> Do not post passwords, full credit card numbers, or student ID numbers. You can verify claimants privately via in-app recovery requests.
        </p>
      </div>

      {/* Submit / Cancel buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/30 transition disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Publishing Listing...</span>
            </>
          ) : (
            <span>Publish {formData.type === 'found' ? 'Found' : 'Lost'} Report</span>
          )}
        </button>
      </div>
    </form>
  );
}
