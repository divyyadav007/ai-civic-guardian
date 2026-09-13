import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Upload,
  RefreshCw,
  Copy,
  Check,
  Building2,
  FileText,
  Phone,
  User,
  Info,
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { complaintsApi, DraftResponseData, SubmitResponseData } from '../api/complaints';

// Sample civic images for quick testing by evaluators/citizens
const SAMPLE_PHOTOS = [
  {
    label: 'Road Pothole',
    type: 'pothole',
    url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Garbage Dump',
    type: 'garbage',
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Broken Streetlight',
    type: 'broken_streetlight',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Water Leakage',
    type: 'water_leakage',
    url: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80',
  },
];

export const CitizenReportPage: React.FC = () => {
  const navigate = useNavigate();

  // Multi-step progress: 'form' -> 'analyzing' -> 'review' -> 'submitting' -> 'confirmed'
  const [currentStep, setCurrentStep] = useState<'form' | 'analyzing' | 'review' | 'submitting' | 'confirmed'>('form');

  // Input states
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [typedDescription, setTypedDescription] = useState<string>('');
  const [citizenName, setCitizenName] = useState<string>('');
  const [citizenPhone, setCitizenPhone] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(26.8467);
  const [longitude, setLongitude] = useState<number | null>(80.9462);
  const [address, setAddress] = useState<string>('Hazratganj, Lucknow, Uttar Pradesh');
  const [detectingGps, setDetectingGps] = useState<boolean>(false);

  // Draft analysis result
  const [draft, setDraft] = useState<DraftResponseData | null>(null);
  const [reviewCategory, setReviewCategory] = useState<string>('pothole');
  const [reviewDescription, setReviewDescription] = useState<string>('');
  const [reviewAddress, setReviewAddress] = useState<string>('');

  // Submission result
  const [submission, setSubmission] = useState<SubmitResponseData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Default sample photo
  useEffect(() => {
    setPhotoPreview(SAMPLE_PHOTOS[0].url);
    setPhotoDataUrl(SAMPLE_PHOTOS[0].url);
  }, []);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPhotoDataUrl(result);
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  // Select sample photo
  const handleSelectSample = (url: string) => {
    setPhotoPreview(url);
    setPhotoDataUrl(url);
  };

  // Browser Geolocation Detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setDetectingGps(false);
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
        setDetectingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Submit form for AI Draft Analysis
  const handleAnalyzeIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoDataUrl) {
      setErrorMessage('Please upload or select an issue photo.');
      return;
    }

    setErrorMessage('');
    setCurrentStep('analyzing');

    try {
      const res = await complaintsApi.createDraft({
        photo_url: photoDataUrl,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        typed_description: typedDescription.trim() || undefined,
      });

      setDraft(res);
      setReviewCategory(res.detected_issue_type || 'pothole');
      setReviewDescription(res.description || typedDescription || 'Civic issue detected.');
      setReviewAddress(res.address || address);
      setCurrentStep('review');
    } catch (err: any) {
      console.error('Draft creation failed:', err);
      setErrorMessage(err?.response?.data?.error?.message || 'Failed to analyze issue. Please try again.');
      setCurrentStep('form');
    }
  };

  // Approve & Submit Complaint (FR-5 citizen review gate)
  const handleApproveAndSubmit = async () => {
    if (!draft) return;
    setCurrentStep('submitting');
    setErrorMessage('');

    try {
      // 1. Update draft with citizen edits if changed
      if (
        reviewCategory !== draft.detected_issue_type ||
        reviewDescription !== draft.description ||
        reviewAddress !== draft.address
      ) {
        await complaintsApi.updateDraft(draft.draft_id, {
          detected_issue_type: reviewCategory,
          description: reviewDescription,
          address: reviewAddress,
        });
      }

      // 2. Submit the complaint
      const subRes = await complaintsApi.submit(draft.draft_id);
      setSubmission(subRes);
      setCurrentStep('confirmed');
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err?.response?.data?.error?.message || 'Submission failed. Please try again.');
      setCurrentStep('review');
    }
  };

  const handleCopyId = () => {
    if (!submission?.complaint_id) return;
    navigator.clipboard.writeText(submission.complaint_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'pothole':
        return 'Road Pothole';
      case 'garbage':
        return 'Garbage / Solid Waste';
      case 'water_leakage':
        return 'Water Leakage / Pipe Burst';
      case 'broken_streetlight':
        return 'Broken Streetlight';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  currentStep === 'form' || currentStep === 'analyzing'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                1
              </div>
              <span className="text-xs font-semibold text-slate-700 mt-1">Capture</span>
            </div>
            <div className={`flex-1 h-1 mx-2 ${currentStep !== 'form' && currentStep !== 'analyzing' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  currentStep === 'review' || currentStep === 'submitting'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30'
                    : currentStep === 'confirmed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                2
              </div>
              <span className="text-xs font-semibold text-slate-700 mt-1">AI Review</span>
            </div>
            <div className={`flex-1 h-1 mx-2 ${currentStep === 'confirmed' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  currentStep === 'confirmed' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-200 text-slate-500'
                }`}
              >
                3
              </div>
              <span className="text-xs font-semibold text-slate-700 mt-1">Track</span>
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-800 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Capture & Report Form */}
        {currentStep === 'form' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Report a Civic Problem</h1>
              <p className="text-sm text-slate-600 mt-1">
                Upload or snap a photo of a road pothole, garbage dump, broken streetlight, or water leakage. Our AI will automatically classify the issue and route it to the proper municipal department.
              </p>
            </div>

            <form onSubmit={handleAnalyzeIssue} className="space-y-6">
              {/* Photo Upload / Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  1. Issue Photo <span className="text-red-500">*</span>
                </label>

                {/* Upload Box */}
                <div className="relative border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-4 text-center transition-colors bg-slate-50/50">
                  {photoPreview ? (
                    <div className="relative inline-block group">
                      <img
                        src={photoPreview}
                        alt="Civic Issue Preview"
                        className="w-full max-w-sm max-h-64 object-cover rounded-lg shadow-sm border border-slate-200 mx-auto"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-sm font-medium rounded-lg cursor-pointer transition-opacity"
                      >
                        Click to change photo
                      </label>
                    </div>
                  ) : (
                    <div className="py-8">
                      <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-700">Click to upload or take a photo</p>
                      <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, WEBP</p>
                    </div>
                  )}

                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Quick Sample Photos for Testing */}
                <div className="mt-3">
                  <span className="text-xs text-slate-500 font-medium mr-2">Or select a demo photo:</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {SAMPLE_PHOTOS.map((sample) => (
                      <button
                        key={sample.type}
                        type="button"
                        onClick={() => handleSelectSample(sample.url)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                          photoPreview === sample.url
                            ? 'bg-sky-50 border-sky-400 text-sky-700 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Location Detection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-800">
                    2. Location Pinpoint
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingGps}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{detectingGps ? 'Detecting GPS...' : '📍 Use My Current Location'}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Locality, Landmark, Ward, City..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>GPS: {latitude?.toFixed(4)}° N, {longitude?.toFixed(4)}° E</span>
                    <span>Auto-verified with reverse geocoding</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  3. Description or Landmark (Optional)
                </label>
                <textarea
                  rows={3}
                  value={typedDescription}
                  onChange={(e) => setTypedDescription(e.target.value)}
                  placeholder="e.g. Deep pothole near hospital main gate causing severe traffic hazard to two-wheelers..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              {/* Citizen Contact (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Your Name (Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder="e.g. Divyanshu Yadav"
                    className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mobile Number (Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={citizenPhone}
                    onChange={(e) => setCitizenPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold text-base shadow-lg shadow-sky-500/25 hover:from-sky-700 hover:to-indigo-700 transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5 text-sky-200" />
                <span>Analyze with AI & Generate Draft</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Analyzing Loading State */}
        {currentStep === 'analyzing' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4 border border-sky-100">
              <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Analyzing Civic Grievance</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              Running real MobileNetV2 vision classification to recognize the problem, resolving GPS address, and structuring your complaint draft...
            </p>
            <div className="inline-flex items-center space-x-2 text-xs text-sky-700 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Model: MobileNetV2 Civic v1.0</span>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Approval Gate (PRD FR-5) */}
        {currentStep === 'review' && draft && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                    AI Detection Ready
                  </span>
                  <span className="text-xs text-slate-400">Review Gate (FR-5)</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Review Your Draft Complaint</h2>
              </div>
              <button
                onClick={() => setCurrentStep('form')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Change Photo
              </button>
            </div>

            {/* AI Classification Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Photo Preview */}
              <div className="md:col-span-1">
                <img
                  src={draft.photo_url || photoPreview}
                  alt="Draft Preview"
                  className="w-full h-48 object-cover rounded-xl border border-slate-200"
                />
              </div>

              {/* AI Details & Editable Form */}
              <div className="md:col-span-2 space-y-4">
                {/* AI Detected Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Issue Category (AI Detected)</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      Confidence: {draft.classification_confidence ? `${(draft.classification_confidence * 100).toFixed(1)}%` : 'Manual'}
                    </span>
                  </label>
                  <select
                    value={reviewCategory}
                    onChange={(e) => setReviewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="pothole">Road Pothole (Routes to Roads & Infrastructure)</option>
                    <option value="garbage">Garbage / Solid Waste (Routes to Sanitation)</option>
                    <option value="water_leakage">Water Leakage / Broken Pipe (Routes to Water & Sewage)</option>
                    <option value="broken_streetlight">Broken Streetlight (Routes to Electrical & Lighting)</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resolved Address
                  </label>
                  <input
                    type="text"
                    value={reviewAddress}
                    onChange={(e) => setReviewAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Structured Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Structured Complaint Description
                  </label>
                  <textarea
                    rows={3}
                    value={reviewDescription}
                    onChange={(e) => setReviewDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Department Routing Notice */}
            <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex items-start space-x-3 mb-6">
              <Building2 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div className="text-xs text-sky-900">
                <p className="font-semibold">Automated Department Routing</p>
                <p className="mt-0.5 text-sky-800">
                  Upon approval, this complaint will be directly assigned to the appropriate municipal department officer queue with timestamp tracking.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep('form')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50"
              >
                ← Back to Edit Form
              </button>

              <button
                type="button"
                onClick={handleApproveAndSubmit}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Submit to Municipality</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Submitting Spinner */}
        {currentStep === 'submitting' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900">Submitting to Municipality...</h2>
            <p className="text-xs text-slate-500 mt-1">Registering complaint and routing to department officer queue.</p>
          </div>
        )}

        {/* STEP 5: Confirmed Registration */}
        {currentStep === 'confirmed' && submission && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>

            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              Official Grievance Registered
            </span>

            <h1 className="text-2xl font-bold text-slate-900">Complaint Submitted Successfully</h1>
            <p className="text-sm text-slate-600 mt-1">
              Your grievance has been officially routed to the municipal team. Save your Reference ID below to check live resolution updates.
            </p>

            {/* Reference ID Card */}
            <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Complaint Reference ID</span>
                <p className="font-mono text-lg font-bold text-slate-900">{submission.complaint_id}</p>
              </div>
              <button
                onClick={handleCopyId}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copied!' : 'Copy ID'}</span>
              </button>
            </div>

            {/* Routing Details */}
            <div className="grid grid-cols-2 gap-3 text-left mb-6">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Routed Department</span>
                <span className="text-sm font-semibold text-slate-900">{submission.department_name || 'Municipal Corporation'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Initial Status</span>
                <span className="text-sm font-semibold text-blue-700 capitalize">{submission.status}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate(`/track/${submission.complaint_id}`)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold shadow-md shadow-sky-500/20 flex items-center justify-center space-x-2"
              >
                <span>Track Resolution Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentStep('form');
                  setDraft(null);
                  setSubmission(null);
                  setTypedDescription('');
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Report Another Issue
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
