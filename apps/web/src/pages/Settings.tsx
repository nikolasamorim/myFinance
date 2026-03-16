import React, { useState, useRef } from 'react';
import { User, Camera, Mail, Lock, Shield, Edit2, Save, X, Menu } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Dropdown } from '../components/ui/Dropdown';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  tags?: string[];
  description?: string;
  gender?: string;
  birth_date?: string;
  identification_code: string;
  hometown?: string;
  nationality?: string;
  languages?: string[];
  marital_status?: string;
  permanent_address?: string;
  current_address?: string;
  two_factor_enabled: boolean;
}

type MobileTab = 'perfil' | 'pessoal' | 'conta';

export function Settings() {
  const { user } = useAuth();
  const { data: profile, isLoading, updateProfile, uploadAvatar } = useUserProfile();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({});
  const [mobileTab, setMobileTab] = useState<MobileTab>('perfil');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleEditSection = (section: string) => {
    setEditingSection(section);
    setProfileData(profile || {});
  };

  const handleSaveSection = async (section: string) => {
    try {
      await updateProfile.mutateAsync(profileData);
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setProfileData({});
    setAvatarPreview(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarClick = () => {
    if (editingSection === 'profile') {
      avatarInputRef.current?.click();
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      await uploadAvatar.mutateAsync(file);
      setAvatarPreview(null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setAvatarPreview(null);
    }
  };

  const genderOptions = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Feminino' },
    { value: 'other', label: 'Outro' },
    { value: 'prefer_not_to_say', label: 'Prefiro não dizer' },
  ];

  const maritalStatusOptions = [
    { value: 'single', label: 'Solteiro(a)' },
    { value: 'married', label: 'Casado(a)' },
    { value: 'divorced', label: 'Divorciado(a)' },
    { value: 'widowed', label: 'Viúvo(a)' },
    { value: 'other', label: 'Outro' },
  ];

  const mobileTabs: { id: MobileTab; label: string }[] = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'pessoal', label: 'Pessoal' },
    { id: 'conta', label: 'Conta' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-bg-elevated rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="h-64 bg-bg-elevated rounded-xl"></div>
                <div className="h-96 bg-bg-elevated rounded-xl"></div>
              </div>
              <div className="h-64 bg-bg-elevated rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avatarSrc = avatarPreview || profile?.avatar_url;

  const ProfileSection = (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Perfil
          </CardTitle>
          {editingSection !== 'profile' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditSection('profile')}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Editar
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveSection('profile')}
                loading={updateProfile.isPending}
              >
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div
              className={`w-20 h-20 bg-bg-elevated rounded-full flex items-center justify-center overflow-hidden ${editingSection === 'profile' ? 'cursor-pointer' : ''}`}
              onClick={handleAvatarClick}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-text-secondary" />
              )}
            </div>
            {editingSection === 'profile' && (
              <button
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white hover:bg-accent-hover"
                onClick={handleAvatarClick}
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            {editingSection === 'profile' ? (
              <Input
                value={profileData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome completo"
                className="text-lg font-semibold"
              />
            ) : (
              <h2 className="text-lg font-semibold text-text-primary truncate">
                {profile?.name || 'Nome não informado'}
              </h2>
            )}
            <p className="text-sm text-text-secondary truncate">{profile?.email}</p>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Tags
          </label>
          {editingSection === 'profile' ? (
            <Input
              value={profileData.tags?.join(', ') || ''}
              onChange={(e) => handleInputChange('tags', e.target.value.split(', ').filter(Boolean))}
              placeholder="Ex: Desenvolvedor, Líder de equipe"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile?.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full"
                >
                  {tag}
                </span>
              )) || <span className="text-sm text-text-muted">Nenhuma tag adicionada</span>}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Descrição
          </label>
          {editingSection === 'profile' ? (
            <textarea
              value={profileData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Conte um pouco sobre você..."
              className="w-full px-3 py-2 border border-border rounded-md bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent"
              rows={3}
            />
          ) : (
            <p className="text-sm text-text-secondary">
              {profile?.description || 'Nenhuma descrição adicionada'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const PersonalSection = (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Informações Pessoais</CardTitle>
          {editingSection !== 'personal' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditSection('personal')}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Editar
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveSection('personal')}
                loading={updateProfile.isPending}
              >
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Gênero
            </label>
            {editingSection === 'personal' ? (
              <Dropdown
                options={genderOptions}
                value={profileData.gender || ''}
                onChange={(value) => handleInputChange('gender', value)}
                placeholder="Selecione"
              />
            ) : (
              <p className="text-sm text-text-primary">
                {genderOptions.find(g => g.value === profile?.gender)?.label || 'Não informado'}
              </p>
            )}
          </div>

          {/* Birth Date */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Data de Nascimento
            </label>
            {editingSection === 'personal' ? (
              <Input
                type="date"
                value={profileData.birth_date || ''}
                onChange={(e) => handleInputChange('birth_date', e.target.value)}
              />
            ) : (
              <p className="text-sm text-text-primary">
                {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}
              </p>
            )}
          </div>
        </div>

        {/* Identification Code */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Código de Identificação
          </label>
          <p className="text-sm text-text-primary font-mono bg-bg-surface px-3 py-2 rounded border border-border break-all">
            {profile?.identification_code || 'Não gerado'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Hometown */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Cidade Natal
            </label>
            {editingSection === 'personal' ? (
              <Input
                value={profileData.hometown || ''}
                onChange={(e) => handleInputChange('hometown', e.target.value)}
                placeholder="Ex: São Paulo, SP"
              />
            ) : (
              <p className="text-sm text-text-primary">
                {profile?.hometown || 'Não informado'}
              </p>
            )}
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Nacionalidade
            </label>
            {editingSection === 'personal' ? (
              <Input
                value={profileData.nationality || ''}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
                placeholder="Ex: Brasileira"
              />
            ) : (
              <p className="text-sm text-text-primary">
                {profile?.nationality || 'Não informado'}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Idiomas
            </label>
            {editingSection === 'personal' ? (
              <Input
                value={profileData.languages?.join(', ') || ''}
                onChange={(e) => handleInputChange('languages', e.target.value.split(', ').filter(Boolean))}
                placeholder="Ex: Português, Inglês"
              />
            ) : (
              <p className="text-sm text-text-primary">
                {profile?.languages?.join(', ') || 'Não informado'}
              </p>
            )}
          </div>

          {/* Marital Status */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Estado Civil
            </label>
            {editingSection === 'personal' ? (
              <Dropdown
                options={maritalStatusOptions}
                value={profileData.marital_status || ''}
                onChange={(value) => handleInputChange('marital_status', value)}
                placeholder="Selecione"
              />
            ) : (
              <p className="text-sm text-text-primary">
                {maritalStatusOptions.find(m => m.value === profile?.marital_status)?.label || 'Não informado'}
              </p>
            )}
          </div>
        </div>

        {/* Addresses */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Endereço Permanente
            </label>
            {editingSection === 'personal' ? (
              <textarea
                value={profileData.permanent_address || ''}
                onChange={(e) => handleInputChange('permanent_address', e.target.value)}
                placeholder="Endereço completo..."
                className="w-full px-3 py-2 border border-border rounded-md bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent"
                rows={2}
              />
            ) : (
              <p className="text-sm text-text-primary">
                {profile?.permanent_address || 'Não informado'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Endereço Atual
            </label>
            {editingSection === 'personal' ? (
              <textarea
                value={profileData.current_address || ''}
                onChange={(e) => handleInputChange('current_address', e.target.value)}
                placeholder="Endereço completo..."
                className="w-full px-3 py-2 border border-border rounded-md bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent"
                rows={2}
              />
            ) : (
              <p className="text-sm text-text-primary">
                {profile?.current_address || 'Não informado'}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const AccountSection = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Informações da Conta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-bg-surface rounded-lg">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-secondary">E-mail</p>
            <p className="text-sm text-text-primary truncate">{profile?.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailModal(true)}
            className="flex-shrink-0"
          >
            Alterar e-mail
          </Button>
        </div>

        {/* Password */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-bg-surface rounded-lg">
          <div>
            <p className="text-sm font-medium text-text-secondary">Senha</p>
            <p className="text-sm text-text-muted">••••••••</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
            className="flex-shrink-0"
          >
            Alterar senha
          </Button>
        </div>

        {/* Two Factor Authentication */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-bg-surface rounded-lg">
          <div>
            <p className="text-sm font-medium text-text-secondary">Autenticação de 2 Fatores</p>
            <p className="text-sm text-text-muted">
              {profile?.two_factor_enabled ? 'Ativada' : 'Desativada'}
            </p>
          </div>
          <Button
            variant={profile?.two_factor_enabled ? "outline" : "primary"}
            size="sm"
            onClick={() => setShow2FAModal(true)}
            className="flex-shrink-0"
          >
            <Shield className="w-4 h-4 mr-1" />
            {profile?.two_factor_enabled ? 'Gerenciar' : 'Ativar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Configurações da Conta</h1>
          <p className="text-text-secondary mt-1 text-sm">Gerencie suas informações pessoais e configurações de segurança</p>
        </div>

        {/* Mobile tabs */}
        <div className="flex lg:hidden border-b border-border overflow-x-auto">
          {mobileTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 min-w-fit px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                mobileTab === tab.id
                  ? 'border-accent text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Desktop: 2-column layout */}
        <div className="hidden lg:grid grid-cols-2 gap-8">
          <div className="space-y-6">
            {ProfileSection}
            {PersonalSection}
          </div>
          <div className="space-y-6">
            {AccountSection}
          </div>
        </div>

        {/* Mobile: tab-based layout */}
        <div className="lg:hidden space-y-6">
          {mobileTab === 'perfil' && ProfileSection}
          {mobileTab === 'pessoal' && PersonalSection}
          {mobileTab === 'conta' && AccountSection}
        </div>
      </div>

      {/* Email Change Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Alterar E-mail"
      >
        <div className="space-y-4">
          <Input
            label="E-mail atual"
            value={profile?.email || ''}
            disabled
          />
          <Input
            label="Novo e-mail"
            type="email"
            placeholder="Digite o novo e-mail"
          />
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Você receberá um e-mail de confirmação no novo endereço antes da alteração ser efetivada.
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>
              Cancelar
            </Button>
            <Button>
              Enviar confirmação
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Alterar Senha"
      >
        <div className="space-y-4">
          <Input
            label="Senha atual"
            type="password"
            placeholder="Digite sua senha atual"
          />
          <Input
            label="Nova senha"
            type="password"
            placeholder="Digite a nova senha"
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            placeholder="Confirme a nova senha"
          />
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancelar
            </Button>
            <Button>
              Alterar senha
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        title="Autenticação de 2 Fatores"
        size="lg"
      >
        <div className="space-y-6">
          {!profile?.two_factor_enabled ? (
            <>
              <div className="text-center">
                <div className="w-40 h-40 sm:w-48 sm:h-48 bg-bg-elevated rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <p className="text-text-muted">QR Code aqui</p>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  Escaneie este QR code com seu app autenticador
                </p>
                <div className="bg-bg-surface p-3 rounded-lg">
                  <p className="text-xs font-mono text-text-secondary break-all">
                    Chave secreta: ABCD-EFGH-IJKL-MNOP
                  </p>
                </div>
              </div>
              <Input
                label="Código de verificação"
                placeholder="Digite o código de 6 dígitos"
                maxLength={6}
              />
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShow2FAModal(false)}>
                  Cancelar
                </Button>
                <Button>
                  Ativar 2FA
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">2FA Ativado</h3>
              <p className="text-text-secondary">
                Sua conta está protegida com autenticação de dois fatores.
              </p>
              <div className="flex justify-center space-x-3">
                <Button variant="outline" onClick={() => setShow2FAModal(false)}>
                  Fechar
                </Button>
                <Button variant="outline">
                  Desativar 2FA
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
