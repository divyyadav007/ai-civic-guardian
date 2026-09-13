import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { config, SERVER_PRESETS } from './src/config';
import {
  mobileApi,
  DraftResponse,
  PublicComplaintTrack,
  ComplaintStatus,
} from './src/api/client';

interface SampleIssue {
  id: string;
  label: string;
  icon: string;
  photoUrl: string;
  defaultDescription: string;
}

const SAMPLE_ISSUES: SampleIssue[] = [
  {
    id: 'pothole',
    label: 'Pothole',
    icon: '🕳️',
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
    defaultDescription: 'Large deep pothole on road causing hazardous driving conditions.',
  },
  {
    id: 'garbage',
    label: 'Garbage Dump',
    icon: '🗑️',
    photoUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600',
    defaultDescription: 'Overflowing municipal garbage bin blocking public walkway.',
  },
  {
    id: 'water_leakage',
    label: 'Water Leak',
    icon: '💧',
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=600',
    defaultDescription: 'Municipal main water pipeline leaking onto the street.',
  },
  {
    id: 'broken_streetlight',
    label: 'Streetlight',
    icon: '💡',
    photoUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600',
    defaultDescription: 'Streetlight completely dark for over 3 days, safety concern.',
  },
];

interface LocalComplaintItem {
  id: string;
  issue_type: string;
  description: string;
  address: string;
  status: ComplaintStatus;
  department_name: string;
  photo_url: string;
  submitted_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'report' | 'complaints' | 'profile'>('report');
  const [step, setStep] = useState<'capture' | 'processing' | 'review' | 'confirmation'>('capture');

  // Network connection state
  const [serverUrl, setServerUrl] = useState(config.getBaseUrl());
  const [serverHealthy, setServerHealthy] = useState<boolean | null>(null);
  const [healthMessage, setHealthMessage] = useState('Checking connection...');
  const [customUrlInput, setCustomUrlInput] = useState(config.getBaseUrl());

  // Capture state
  const [selectedSample, setSelectedSample] = useState<SampleIssue>(SAMPLE_ISSUES[0]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState(SAMPLE_ISSUES[0].photoUrl);
  const [typedDesc, setTypedDesc] = useState(SAMPLE_ISSUES[0].defaultDescription);
  const [latitude, setLatitude] = useState(26.8467);
  const [longitude, setLongitude] = useState(80.9462);
  const [gpsStatus, setGpsStatus] = useState('GPS: 26.8467° N, 80.9462° E (Hazratganj)');

  // Draft / AI state from backend
  const [currentDraft, setCurrentDraft] = useState<DraftResponse | null>(null);
  const [reviewIssueType, setReviewIssueType] = useState('pothole');
  const [reviewAddress, setReviewAddress] = useState('');
  const [reviewDescription, setReviewDescription] = useState('');
  const [confirmedId, setConfirmedId] = useState('');
  const [confirmedDept, setConfirmedDept] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // My Complaints list
  const [myComplaints, setMyComplaints] = useState<LocalComplaintItem[]>([
    {
      id: 'CG-2026-8841',
      issue_type: 'pothole',
      description: 'Deep road pothole causing vehicular damage near hospital junction.',
      address: 'Hazratganj Main Road, Sector 4, Lucknow',
      status: 'submitted',
      department_name: 'Roads & Infrastructure',
      photo_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
      submitted_at: '10 mins ago',
    },
    {
      id: 'CG-2026-5120',
      issue_type: 'garbage',
      description: 'Municipal garbage dump overflow on pedestrian walkway.',
      address: 'Market Lane, Ward 14, Lucknow',
      status: 'in_progress',
      department_name: 'Sanitation & Solid Waste',
      photo_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600',
      submitted_at: 'Yesterday',
    },
  ]);

  const [selectedComplaint, setSelectedComplaint] = useState<LocalComplaintItem | null>(null);
  const [trackDetail, setTrackDetail] = useState<PublicComplaintTrack | null>(null);
  const [isRefreshingTrack, setIsRefreshingTrack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check health on mount and on URL change
  useEffect(() => {
    checkHealth();
    tryDetectLocation();
  }, [serverUrl]);

  const checkHealth = async () => {
    setHealthMessage('Pinging backend...');
    const res = await mobileApi.checkBackendHealth();
    setServerHealthy(res.ok);
    setHealthMessage(res.ok ? '🟢 Backend Connected' : `🔴 Backend Error: ${res.statusText}`);
  };

  const tryDetectLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setGpsStatus(`GPS: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E (Auto-detected)`);
        },
        () => {
          setGpsStatus('GPS: 26.8467° N, 80.9462° E (Default Lucknow Civic)');
        },
        { timeout: 5000 }
      );
    }
  };

  const handleSelectSample = (sample: SampleIssue) => {
    setSelectedSample(sample);
    setCustomPhotoUrl(sample.photoUrl);
    setTypedDesc(sample.defaultDescription);
    setErrorMessage('');
  };

  // Web file input trigger for real photo uploads
  const handleWebFileUpload = (e: any) => {
    const file = e?.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCustomPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 1 -> Step 2: Call real backend AI pipeline
  const handleAnalyzeAndDetect = async () => {
    setErrorMessage('');
    setStep('processing');
    try {
      const payload = {
        photo_url: customPhotoUrl,
        latitude,
        longitude,
        typed_description: typedDesc,
      };
      const draft = await mobileApi.createDraft(payload);
      setCurrentDraft(draft);
      setReviewIssueType(draft.detected_issue_type || 'pothole');
      setReviewAddress(draft.address || 'Hazratganj, Lucknow');
      setReviewDescription(draft.description || typedDesc);
      setStep('review');
    } catch (err: any) {
      console.error('Draft creation error:', err);
      setErrorMessage(err?.message || 'Failed to connect to backend AI pipeline.');
      setStep('capture');
    }
  };

  // Step 3: Citizen explicit approval & submit
  const handleApproveAndSubmit = async () => {
    if (!currentDraft) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      // 1. If citizen changed issue type or description, update the draft first
      if (
        reviewIssueType !== currentDraft.detected_issue_type ||
        reviewDescription !== currentDraft.description ||
        reviewAddress !== currentDraft.address
      ) {
        await mobileApi.updateDraft(currentDraft.draft_id, {
          detected_issue_type: reviewIssueType,
          description: reviewDescription,
          address: reviewAddress,
        });
      }

      // 2. Submit complaint
      const res = await mobileApi.submitComplaint(currentDraft.draft_id);
      const trackingId = res.complaint_id;
      const dept = res.department_name || 'Municipal Works';

      setConfirmedId(trackingId);
      setConfirmedDept(dept);

      // 3. Add to local list
      const newItem: LocalComplaintItem = {
        id: trackingId,
        issue_type: reviewIssueType,
        description: reviewDescription,
        address: reviewAddress,
        status: 'submitted',
        department_name: dept,
        photo_url: customPhotoUrl,
        submitted_at: 'Just now',
      };
      setMyComplaints((prev) => [newItem, ...prev]);

      setStep('confirmation');
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMessage(err?.message || 'Failed to submit grievance to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh single complaint status from backend
  const handleOpenComplaintDetail = async (item: LocalComplaintItem) => {
    setSelectedComplaint(item);
    setTrackDetail(null);
    setIsRefreshingTrack(true);
    try {
      const liveData = await mobileApi.trackComplaint(item.id);
      setTrackDetail(liveData);
      // Update local item status if changed
      setMyComplaints((prev) =>
        prev.map((c) =>
          c.id === item.id
            ? {
                ...c,
                status: liveData.status,
                department_name: liveData.department_name || c.department_name,
                description: liveData.description || c.description,
              }
            : c
        )
      );
    } catch (err) {
      console.log('Public track lookup notice:', err);
    } finally {
      setIsRefreshingTrack(false);
    }
  };

  const handleRefreshTrack = async () => {
    if (!selectedComplaint) return;
    setIsRefreshingTrack(true);
    try {
      const liveData = await mobileApi.trackComplaint(selectedComplaint.id);
      setTrackDetail(liveData);
      setSelectedComplaint((prev) => (prev ? { ...prev, status: liveData.status } : null));
    } catch (err) {
      console.log('Refresh track error:', err);
    } finally {
      setIsRefreshingTrack(false);
    }
  };

  const handleSwitchPreset = (presetUrl: string) => {
    config.setBaseUrl(presetUrl);
    setServerUrl(presetUrl);
    setCustomUrlInput(presetUrl);
  };

  const handleApplyCustomUrl = () => {
    config.setBaseUrl(customUrlInput);
    setServerUrl(customUrlInput);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>AI Civic Guardian</Text>
          <View
            style={[
              styles.connectionIndicator,
              serverHealthy ? styles.indicatorGreen : styles.indicatorRed,
            ]}
          >
            <Text style={styles.connectionIndicatorText}>
              {serverHealthy ? 'API LIVE' : 'OFFLINE'}
            </Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Citizen Mobile Grievance Redressal</Text>
      </View>

      {/* Main Body */}
      <View style={styles.body}>
        {/* TAB 1: REPORT ISSUE */}
        {activeTab === 'report' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* STEP 1: CAPTURE / SELECT */}
            {step === 'capture' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Report Civic Problem</Text>
                <Text style={styles.cardDesc}>
                  Select or photograph an issue. The real MobileNetV2 ONNX model will classify the problem and route to municipal authorities.
                </Text>

                {/* Sample Civic Issue Selector */}
                <Text style={styles.fieldLabel}>CHOOSE CIVIC ISSUE TYPE</Text>
                <View style={styles.sampleGrid}>
                  {SAMPLE_ISSUES.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleSelectSample(item)}
                      style={[
                        styles.sampleButton,
                        selectedSample.id === item.id && styles.sampleButtonActive,
                      ]}
                    >
                      <Text style={styles.sampleIcon}>{item.icon}</Text>
                      <Text
                        style={[
                          styles.sampleLabel,
                          selectedSample.id === item.id && styles.sampleLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Viewfinder Preview */}
                <View style={styles.viewfinder}>
                  <Image source={{ uri: customPhotoUrl }} style={styles.previewImage} />
                  <View style={styles.overlayBadge}>
                    <Text style={styles.overlayBadgeText}>{gpsStatus}</Text>
                  </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleAnalyzeAndDetect}
                >
                  <Text style={styles.primaryButtonText}>
                    ⚡ Analyze with AI ({selectedSample.label})
                  </Text>
                </TouchableOpacity>

                {Platform.OS === 'web' && (
                  <View style={styles.fileUploadWrapper}>
                    <label style={styles.webFileLabel as any}>
                      📁 Select Photo from Device
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleWebFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </View>
                )}

                <Text style={styles.fieldLabel}>BRIEF PROBLEM DESCRIPTION</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  multiline
                  numberOfLines={2}
                  value={typedDesc}
                  onChangeText={setTypedDesc}
                  placeholder="Describe location details or severity..."
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}

            {/* STEP 2: LIVE AI PROCESSING */}
            {step === 'processing' && (
              <View style={[styles.card, styles.processingCard]}>
                <ActivityIndicator size="large" color="#0284c7" style={{ marginBottom: 16 }} />
                <Text style={styles.processingTitle}>Executing AI Inference...</Text>
                <Text style={styles.processingSubtitle}>
                  Connecting to backend: {serverUrl}
                </Text>

                <View style={styles.pipelineBox}>
                  <View style={styles.pipelineStep}>
                    <Text style={styles.stepCheck}>✓</Text>
                    <Text style={styles.stepText}>Image classification (MobileNetV2 ONNX)</Text>
                  </View>
                  <View style={styles.pipelineStep}>
                    <Text style={styles.stepCheck}>✓</Text>
                    <Text style={styles.stepText}>Reverse geocoding (OpenStreetMap / GPS)</Text>
                  </View>
                  <View style={styles.pipelineStep}>
                    <Text style={styles.stepCheck}>✓</Text>
                    <Text style={styles.stepText}>Automated department routing</Text>
                  </View>
                </View>

                <Text style={styles.processingHint}>
                  Synthesizing structured draft for citizen review...
                </Text>
              </View>
            )}

            {/* STEP 3: CITIZEN REVIEW & APPROVAL GATE */}
            {step === 'review' && currentDraft && (
              <View style={styles.card}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.cardTitle}>Citizen Review Gate</Text>
                  <View style={styles.trustBadge}>
                    <Text style={styles.trustBadgeText}>Consent Required</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc}>
                  Complaints are NEVER submitted automatically. Please review and verify the AI-detected details below.
                </Text>

                <Image source={{ uri: currentDraft.photo_url || customPhotoUrl }} style={styles.reviewThumbnail} />

                {/* AI Confidence & Version Banner */}
                <View style={styles.aiMetricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>AI CONFIDENCE</Text>
                    <Text style={styles.metricValue}>
                      {((currentDraft.classification_confidence || 0.88) * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>MODEL</Text>
                    <Text style={styles.metricValue}>
                      {currentDraft.model_version || 'mobilenet-v2-civic'}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>DRAFT ID</Text>
                    <Text style={styles.metricValue}>
                      {currentDraft.draft_id.slice(0, 8)}...
                    </Text>
                  </View>
                </View>

                {currentDraft.needs_manual_category && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      ⚠️ Confidence below threshold. Please confirm or select the correct category below.
                    </Text>
                  </View>
                )}

                {/* Issue Type Chips */}
                <Text style={styles.fieldLabel}>DETECTED CATEGORY (TAP TO CHANGE)</Text>
                <View style={styles.tagRow}>
                  {['pothole', 'garbage', 'water_leakage', 'broken_streetlight'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setReviewIssueType(type)}
                      style={[
                        styles.typeChip,
                        reviewIssueType === type && styles.typeChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          reviewIssueType === type && styles.typeChipTextActive,
                        ]}
                      >
                        {type.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Address */}
                <Text style={styles.fieldLabel}>GEOCODED ADDRESS (EDITABLE)</Text>
                <TextInput
                  style={styles.textInput}
                  value={reviewAddress}
                  onChangeText={setReviewAddress}
                />

                {/* Description */}
                <Text style={styles.fieldLabel}>COMPLAINT DESCRIPTION (EDITABLE)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  multiline
                  numberOfLines={3}
                  value={reviewDescription}
                  onChangeText={setReviewDescription}
                />

                {/* Approve Button */}
                <TouchableOpacity
                  style={[styles.approveButton, isSubmitting && styles.buttonDisabled]}
                  disabled={isSubmitting}
                  onPress={handleApproveAndSubmit}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.approveButtonText}>
                      ✓ Approve & Submit Grievance
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.discardButton}
                  onPress={() => setStep('capture')}
                >
                  <Text style={styles.discardButtonText}>Discard / Retake</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 4: SUBMITTED CONFIRMATION */}
            {step === 'confirmation' && (
              <View style={[styles.card, styles.confirmationCard]}>
                <Text style={styles.successIcon}>🎉</Text>
                <Text style={styles.cardTitle}>Grievance Registered!</Text>
                <Text style={styles.refCode}>Tracking ID: {confirmedId}</Text>
                <Text style={styles.deptNotice}>
                  Routed to: <Text style={{ fontWeight: 'bold' }}>{confirmedDept}</Text>
                </Text>
                <Text style={styles.cardDesc}>
                  Your complaint has been submitted to the municipal database. You can track resolution in the "My Reports" tab.
                </Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    setActiveTab('complaints');
                    setStep('capture');
                  }}
                >
                  <Text style={styles.primaryButtonText}>View in My Reports</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setStep('capture')}
                >
                  <Text style={styles.secondaryButtonText}>Report Another Issue</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* TAB 2: MY COMPLAINTS */}
        {activeTab === 'complaints' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.pageTitle}>Submitted Grievances</Text>
              <Text style={styles.badgeCount}>{myComplaints.length} Total</Text>
            </View>

            {selectedComplaint ? (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedComplaint(null)}
                >
                  <Text style={styles.backButtonText}>← Back to My Reports</Text>
                </TouchableOpacity>

                <View style={styles.detailTitleRow}>
                  <Text style={styles.detailTitle}>
                    {selectedComplaint.issue_type.replace('_', ' ').toUpperCase()}
                  </Text>
                  <View style={[styles.statusPill, getStatusStyle(selectedComplaint.status)]}>
                    <Text style={styles.statusPillText}>
                      {selectedComplaint.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.refCode}>Ref: {selectedComplaint.id}</Text>
                <Image
                  source={{ uri: selectedComplaint.photo_url }}
                  style={styles.detailPhoto}
                />

                <Text style={styles.fieldLabel}>LOCATION</Text>
                <Text style={styles.detailLocation}>{selectedComplaint.address}</Text>

                <Text style={styles.fieldLabel}>ASSIGNED MUNICIPAL DEPARTMENT</Text>
                <Text style={styles.detailDept}>
                  {trackDetail?.department_name || selectedComplaint.department_name}
                </Text>

                <Text style={styles.fieldLabel}>DESCRIPTION</Text>
                <Text style={styles.detailLocation}>
                  {trackDetail?.description || selectedComplaint.description}
                </Text>

                {/* Resolution Stepper */}
                <View style={styles.timelineHeaderRow}>
                  <Text style={styles.timelineHeader}>Redressal Timeline</Text>
                  <TouchableOpacity
                    style={styles.refreshBadge}
                    onPress={handleRefreshTrack}
                    disabled={isRefreshingTrack}
                  >
                    {isRefreshingTrack ? (
                      <ActivityIndicator size="small" color="#0284c7" />
                    ) : (
                      <Text style={styles.refreshBadgeText}>🔄 Refresh</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.timelineWrapper}>
                  {renderTimelineStep(
                    '1',
                    'Submitted',
                    'Grievance registered in municipal system',
                    true
                  )}
                  {renderTimelineStep(
                    '2',
                    'Acknowledged',
                    'Reviewed by departmental nodal officer',
                    selectedComplaint.status !== 'submitted'
                  )}
                  {renderTimelineStep(
                    '3',
                    'In Progress',
                    'Work order dispatched to field maintenance crew',
                    selectedComplaint.status === 'in_progress' ||
                      selectedComplaint.status === 'resolved'
                  )}
                  {renderTimelineStep(
                    '4',
                    'Resolved',
                    'On-site repair completed and verified',
                    selectedComplaint.status === 'resolved'
                  )}
                </View>

                {trackDetail?.status_history && trackDetail.status_history.length > 0 && (
                  <View style={styles.historyBox}>
                    <Text style={styles.fieldLabel}>STATUS AUDIT LOG</Text>
                    {trackDetail.status_history.map((h) => (
                      <View key={h.id} style={styles.historyRow}>
                        <Text style={styles.historyStatus}>{h.status.toUpperCase()}:</Text>
                        <Text style={styles.historyNote}>{h.note || 'Status updated'}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              myComplaints.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.complaintCard}
                  onPress={() => handleOpenComplaintDetail(item)}
                >
                  <Image source={{ uri: item.photo_url }} style={styles.complaintThumb} />
                  <View style={styles.complaintInfo}>
                    <Text style={styles.complaintType}>
                      {item.issue_type.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.complaintAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                    <Text style={styles.complaintMeta}>
                      {item.department_name} · {item.submitted_at}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, getStatusStyle(item.status)]}>
                    <Text style={styles.statusPillText}>{item.status.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}

        {/* TAB 3: PROFILE & SETTINGS */}
        {activeTab === 'profile' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Citizen Profile</Text>
              <Text style={styles.profileName}>Divyanshu Yadav</Text>
              <Text style={styles.profilePhone}>+91 98765 43210 · Verified Citizen</Text>
            </View>

            {/* Backend Connectivity Box */}
            <View style={styles.card}>
              <View style={styles.detailTitleRow}>
                <Text style={styles.cardTitle}>Backend API Connection</Text>
                <TouchableOpacity onPress={checkHealth} style={styles.refreshBadge}>
                  <Text style={styles.refreshBadgeText}>Test Ping</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardDesc}>
                Connect to local FastAPI server across Web, Android emulator, or real mobile devices over Wi-Fi.
              </Text>

              <View
                style={[
                  styles.healthAlert,
                  serverHealthy ? styles.healthAlertGreen : styles.healthAlertRed,
                ]}
              >
                <Text
                  style={[
                    styles.healthAlertText,
                    serverHealthy ? styles.textGreen : styles.textRed,
                  ]}
                >
                  {healthMessage}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>QUICK PRESET TARGETS</Text>
              <View style={styles.presetRow}>
                {SERVER_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => handleSwitchPreset(p.url)}
                    style={[
                      styles.presetButton,
                      serverUrl === p.url && styles.presetButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        serverUrl === p.url && styles.presetButtonTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>ACTIVE API BASE URL</Text>
              <View style={styles.urlInputRow}>
                <TextInput
                  style={[styles.textInput, styles.urlInput]}
                  value={customUrlInput}
                  onChangeText={setCustomUrlInput}
                  placeholder="http://192.168.x.x:8000/api/v1"
                />
                <TouchableOpacity
                  style={styles.urlApplyButton}
                  onPress={handleApplyCustomUrl}
                >
                  <Text style={styles.urlApplyButtonText}>Set</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Application Information</Text>
              <Text style={styles.versionNote}>AI Civic Guardian Mobile v1.0.0</Text>
              <Text style={styles.versionNote}>
                Stack: React Native (Expo 52) · FastAPI REST Backend · MobileNetV2 ONNX
              </Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setActiveTab('report');
            setSelectedComplaint(null);
          }}
        >
          <Text style={[styles.tabLabel, activeTab === 'report' && styles.tabLabelActive]}>
            ➕ Report
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setActiveTab('complaints');
            setSelectedComplaint(null);
          }}
        >
          <Text style={[styles.tabLabel, activeTab === 'complaints' && styles.tabLabelActive]}>
            📋 My Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setActiveTab('profile');
            setSelectedComplaint(null);
          }}
        >
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
            ⚙️ Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function renderTimelineStep(num: string, title: string, desc: string, active: boolean) {
  return (
    <View style={styles.stepItem} key={num}>
      <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
        <Text style={[styles.stepCircleText, active && styles.stepCircleTextActive]}>
          {active ? '✓' : num}
        </Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, active && styles.stepTitleActive]}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'submitted':
      return { backgroundColor: '#2563eb' };
    case 'acknowledged':
      return { backgroundColor: '#4f46e5' };
    case 'in_progress':
      return { backgroundColor: '#ea580c' };
    case 'resolved':
      return { backgroundColor: '#16a34a' };
    default:
      return { backgroundColor: '#64748b' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#e0f2fe',
    marginTop: 2,
  },
  connectionIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  indicatorGreen: {
    backgroundColor: '#16a34a',
  },
  indicatorRed: {
    backgroundColor: '#dc2626',
  },
  connectionIndicatorText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeCount: {
    fontSize: 12,
    backgroundColor: '#e2e8f0',
    color: '#475569',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '500',
  },
  sampleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  sampleButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  sampleButtonActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  sampleIcon: {
    fontSize: 16,
  },
  sampleLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  sampleLabelActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  viewfinder: {
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    backgroundColor: '#0f172a',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  overlayBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overlayBadgeText: {
    color: '#ffffff',
    fontSize: 11,
  },
  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 6,
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '500',
  },
  fileUploadWrapper: {
    marginBottom: 12,
    alignItems: 'center',
  },
  webFileLabel: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
    cursor: 'pointer',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 10,
  },
  textArea: {
    height: 65,
    textAlignVertical: 'top',
  },
  processingCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0284c7',
    marginBottom: 4,
  },
  processingSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 16,
  },
  pipelineBox: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  pipelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepCheck: {
    color: '#16a34a',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    fontSize: 13,
    color: '#334155',
  },
  processingHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 12,
    fontStyle: 'italic',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trustBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#b45309',
  },
  reviewThumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  aiMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'bold',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284c7',
    marginTop: 2,
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 11,
    color: '#b45309',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  typeChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  typeChipActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  typeChipText: {
    fontSize: 12,
    color: '#475569',
    textTransform: 'capitalize',
  },
  typeChipTextActive: {
    color: '#0284c7',
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  discardButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  discardButtonText: {
    color: '#64748b',
    fontSize: 12,
  },
  confirmationCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  refCode: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    color: '#0284c7',
    marginBottom: 6,
  },
  deptNotice: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 8,
  },
  complaintCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  complaintThumb: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 10,
  },
  complaintInfo: {
    flex: 1,
  },
  complaintType: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  complaintAddress: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  complaintMeta: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: '600',
  },
  detailTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  detailPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginVertical: 10,
  },
  detailLocation: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 10,
  },
  detailDept: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '600',
    marginBottom: 12,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  timelineHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  refreshBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  refreshBadgeText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
  },
  timelineWrapper: {
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0',
    marginLeft: 12,
    paddingLeft: 12,
    marginBottom: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    position: 'relative',
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -24,
    marginRight: 10,
  },
  stepCircleActive: {
    backgroundColor: '#16a34a',
  },
  stepCircleText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
  },
  stepCircleTextActive: {
    color: '#ffffff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  stepTitleActive: {
    color: '#0f172a',
  },
  stepDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  historyBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  historyRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
  },
  historyNote: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  profilePhone: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  healthAlert: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
  },
  healthAlertGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  healthAlertRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  healthAlertText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  textGreen: {
    color: '#15803d',
  },
  textRed: {
    color: '#b91c1c',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  presetButtonActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  presetButtonText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  presetButtonTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    marginBottom: 0,
  },
  urlApplyButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
  },
  urlApplyButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  versionNote: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
});
