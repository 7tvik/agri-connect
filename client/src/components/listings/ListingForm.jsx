// src/components/listings/ListingForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createListing } from '../../services/listingService';
import { LISTING_CATEGORIES, UNITS } from '../../utils/constants';
import InputField from '../common/InputField';
import Spinner from '../common/Spinner';
import { useState } from 'react';
import { Upload, X } from 'lucide-react';

// ── Zod schema for form validation ───────────────────────────────────
const listingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Please select a category'),
  pricePerUnit: z.string().min(1, 'Price is required'),
  unit: z.string().min(1, 'Please select a unit'),
  quantityAvailable: z.string().min(1, 'Quantity is required'),
  estimatedAvailableDate: z.string().min(1, 'Please select availability date'),
});

const ListingForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local state for image previews
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageFiles, setImageFiles]       = useState([]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(listingSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createListing,
    onSuccess: () => {
      // Invalidate the listings cache so the new listing appears immediately
      // WHY? React Query caches data. After creating, the cache is stale.
      // invalidateQueries tells React Query to re-fetch fresh data.
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
      toast.success('Listing created successfully! 🌾');
      navigate('/farmer/dashboard');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create listing');
    },
  });

  // Handle image file selection + preview generation
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + imageFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setImageFiles((prev) => [...prev, ...files]);
    // Create preview URLs using FileReader API
    // WHY FileReader? We need to show a preview BEFORE uploading.
    // FileReader reads the file locally and creates a data URL (base64).
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data) => {
    mutate({ ...data, images: imageFiles });
  };

  // Min date = today (can't set availability in the past)
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

      {/* Images Upload */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Product Images (max 5)
        </label>
        <div className="flex flex-wrap gap-3">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {imageFiles.length < 5 && (
            <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 transition-colors">
              <Upload size={20} className="text-gray-400" />
              <span className="text-xs text-gray-400 mt-1">Upload</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>
      </div>

      {/* Title */}
      <InputField
        label="Product Title"
        type="text"
        placeholder="e.g. Fresh Organic Tomatoes"
        error={errors.title?.message}
        {...register('title')}
      />

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={3}
          placeholder="Describe your product — freshness, farming method, quality..."
          className={`input resize-none ${errors.description ? 'border-red-400' : ''}`}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Category + Unit row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select className={`input ${errors.category ? 'border-red-400' : ''}`} {...register('category')}>
            <option value="">Select category</option>
            {LISTING_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Unit</label>
          <select className={`input ${errors.unit ? 'border-red-400' : ''}`} {...register('unit')}>
            <option value="">Select unit</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          {errors.unit && <p className="text-xs text-red-500">{errors.unit.message}</p>}
        </div>
      </div>

      {/* Price + Quantity row */}
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Price per Unit (₹)"
          type="number"
          min="0"
          placeholder="e.g. 40"
          error={errors.pricePerUnit?.message}
          {...register('pricePerUnit')}
        />
        <InputField
          label="Quantity Available"
          type="number"
          min="0"
          placeholder="e.g. 500"
          error={errors.quantityAvailable?.message}
          {...register('quantityAvailable')}
        />
      </div>

      {/* ETA Date */}
      <InputField
        label="Estimated Availability Date"
        type="date"
        min={today}
        error={errors.estimatedAvailableDate?.message}
        {...register('estimatedAvailableDate')}
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {isPending && <Spinner size="sm" />}
        {isPending ? 'Creating listing...' : 'Create Listing 🌾'}
      </button>

    </form>
  );
};

export default ListingForm;