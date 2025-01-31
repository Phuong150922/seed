import * as AuthUIActions from './actions/ui.actions';
import * as AuthAPIActions from './actions/api.actions';
import { initialState, reducer, State } from './auth.reducer';
import { mockUsers, testDisplayName, testEmail, testPassword, testPhotoURL, testUserId } from '@seed/shared/mock-data';
import { AuthProvider, AuthStage } from '@seed/front/shared/types';
import { Action } from '@ngrx/store';
import { mockExpectedActionPayload } from './mocks';

describe('Auth Reducer', () => {
  // region SETUP
  function reducerTest(
    state: Partial<State>,
    action: Action,
    stateDiffExpected: Partial<State>,
    checkErrorAndSuccess?: boolean,
  ): void {
    const setErrorAndSuccess: Partial<State> = checkErrorAndSuccess
      ? {
          error: state.error || { message: 'error' },
          successMessage: state.successMessage || 'success',
        }
      : {};
    const prevStateFull = { ...initialState, ...state, ...setErrorAndSuccess };
    const nextStateFull = reducer(prevStateFull, action);
    const resetErrorAndSuccess: Partial<State> = checkErrorAndSuccess
      ? {
          error: stateDiffExpected.error || undefined,
          successMessage: stateDiffExpected.successMessage || undefined,
        }
      : {};
    expect(nextStateFull).toEqual({ ...prevStateFull, ...stateDiffExpected, ...resetErrorAndSuccess });
  }

  // endregion

  it('should return the previous state in case of unknown action', () =>
    reducerTest(initialState, {} as any, initialState, false));

  describe('UI Actions', () => {
    it(AuthUIActions.signAnonymously.type, () => {
      reducerTest(
        {
          stage: AuthStage.enteringEmail,
          inProgress: false,
        },
        AuthUIActions.signAnonymously(),
        {
          inProgress: true,
          stage: AuthStage.signingAnonymously,
          selectedProvider: AuthProvider.anonymous,
        },
      );
    });

    it(AuthUIActions.enterEmail.type, () => {
      reducerTest(
        { stage: AuthStage.enteringEmail, inProgress: false },
        AuthUIActions.enterEmail({ email: testEmail }),
        { email: testEmail },
      );
    });

    it(AuthAPIActions.enterEmail.type, () => {
      reducerTest(
        { stage: AuthStage.signingEmailLink, inProgress: true },
        AuthAPIActions.enterEmail({ email: testEmail }),
        { email: testEmail },
      );
    });

    it(AuthUIActions.changeUser.type, () => {
      reducerTest(
        {
          stage: AuthStage.signingEmailAndPassword,
          email: testEmail,
          displayName: testDisplayName,
          photoURL: testPhotoURL,
          providers: [AuthProvider.password],
          selectedProvider: AuthProvider.password,
        },
        AuthUIActions.changeUser(),
        {
          stage: AuthStage.enteringEmail,
          email: undefined,
          displayName: undefined,
          photoURL: undefined,
          providers: [],
          selectedProvider: undefined,
        },
      );
    });

    describe(AuthUIActions.deselectProvider.type, () => {
      it(`makes selectedProvider undefined`, () => {
        reducerTest(
          {
            stage: AuthStage.signingGoogle,
            email: testEmail,
            providers: [AuthProvider.password, AuthProvider.link],
            selectedProvider: AuthProvider.password,
          },
          AuthUIActions.deselectProvider(),
          {
            selectedProvider: undefined,
          },
        );
      });

      it(`if stage was "${AuthStage.signingEmailAndPassword}" - changes it to ${AuthStage.choosingProvider}`, () => {
        reducerTest(
          {
            stage: AuthStage.signingEmailAndPassword,
            email: testEmail,
            providers: [AuthProvider.password, AuthProvider.link],
            selectedProvider: AuthProvider.password,
          },
          AuthUIActions.deselectProvider(),
          {
            selectedProvider: undefined,
            stage: AuthStage.choosingProvider,
          },
        );
      });

      it(`if stage was "${AuthStage.signingPhoneNumber}" - changes it to ${AuthStage.choosingProvider}`, () => {
        reducerTest(
          {
            stage: AuthStage.signingPhoneNumber,
            email: testEmail,
            providers: [AuthProvider.phone, AuthProvider.link],
            selectedProvider: AuthProvider.phone,
          },
          AuthUIActions.deselectProvider(),
          {
            selectedProvider: undefined,
            stage: AuthStage.choosingProvider,
          },
        );
      });
    });
    describe(AuthUIActions.selectProvider.type, () => {
      it(`only updates provider for ${AuthProvider.google}`, () => {
        reducerTest(
          {
            stage: AuthStage.choosingProvider,
            email: testEmail,
            providers: [AuthProvider.google, AuthProvider.link],
            selectedProvider: undefined,
          },
          AuthUIActions.selectProvider({ provider: AuthProvider.google }),
          {
            selectedProvider: AuthProvider.google,
          },
        );
      });

      it(`only updates provider for ${AuthProvider.github}`, () => {
        reducerTest(
          {
            stage: AuthStage.choosingProvider,
            email: testEmail,
            providers: [AuthProvider.github, AuthProvider.link],
            selectedProvider: undefined,
          },
          AuthUIActions.selectProvider({ provider: AuthProvider.github }),
          {
            selectedProvider: AuthProvider.github,
          },
        );
      });

      it(`only updates provider for ${AuthProvider.link}`, () => {
        reducerTest(
          {
            stage: AuthStage.choosingProvider,
            email: testEmail,
            providers: [AuthProvider.github, AuthProvider.link],
            selectedProvider: undefined,
          },
          AuthUIActions.selectProvider({ provider: AuthProvider.link }),
          {
            selectedProvider: AuthProvider.link,
          },
        );
      });

      it(`only updates provider for ${AuthProvider.anonymous}`, () => {
        reducerTest(
          {
            stage: AuthStage.choosingProvider,
            email: testEmail,
            providers: [AuthProvider.github, AuthProvider.anonymous],
            selectedProvider: undefined,
          },
          AuthUIActions.selectProvider({ provider: AuthProvider.anonymous }),
          {
            selectedProvider: AuthProvider.anonymous,
          },
        );
      });

      it(`updates provider and stage for ${AuthProvider.password}`, () => {
        reducerTest(
          {
            stage: AuthStage.choosingProvider,
            email: testEmail,
            providers: [AuthProvider.password, AuthProvider.anonymous],
            selectedProvider: undefined,
          },
          AuthUIActions.selectProvider({ provider: AuthProvider.password }),
          {
            selectedProvider: AuthProvider.password,
            stage: AuthStage.signingEmailAndPassword,
          },
        );
      });

      it(`updates provider and stage for ${AuthProvider.phone}`, () => {
        reducerTest(
          {
            stage: AuthStage.choosingProvider,
            email: testEmail,
            providers: [AuthProvider.phone, AuthProvider.anonymous],
            selectedProvider: undefined,
          },
          AuthUIActions.selectProvider({ provider: AuthProvider.phone }),
          {
            selectedProvider: AuthProvider.phone,
            stage: AuthStage.signingPhoneNumber,
          },
        );
      });
    });

    it(AuthUIActions.signGoogle.type, () => {
      reducerTest(
        {
          stage: AuthStage.choosingProvider,
          email: testEmail,
          providers: [AuthProvider.google, AuthProvider.link],
          inProgress: false,
          selectedProvider: AuthProvider.google,
        },
        AuthUIActions.signGoogle(),
        {
          stage: AuthStage.signingGoogle,
          inProgress: true,
        },
      );
    });

    it(AuthUIActions.signGitHub.type, () => {
      reducerTest(
        {
          stage: AuthStage.choosingProvider,
          email: testEmail,
          providers: [AuthProvider.github, AuthProvider.link],
          inProgress: false,
          selectedProvider: AuthProvider.github,
        },
        AuthUIActions.signGitHub(),
        {
          stage: AuthStage.signingGitHub,
          inProgress: true,
        },
      );
    });

    it(AuthUIActions.signEmailLink.type, () => {
      reducerTest(
        {
          stage: AuthStage.choosingProvider,
          email: testEmail,
          providers: [AuthProvider.github, AuthProvider.link],
          inProgress: false,
          selectedProvider: AuthProvider.link,
        },
        AuthUIActions.signEmailLink(),
        {
          stage: AuthStage.signingEmailLink,
          inProgress: true,
        },
      );
    });

    it(AuthUIActions.signEmailPassword.type, () => {
      reducerTest(
        {
          stage: AuthStage.signingEmailAndPassword,
          email: testEmail,
          providers: [AuthProvider.github, AuthProvider.password],
          inProgress: false,
          selectedProvider: AuthProvider.password,
        },
        AuthUIActions.signEmailPassword({ password: testPassword }),
        {
          inProgress: true,
        },
      );
    });

    it(AuthUIActions.signEmailPassword.type, () => {
      reducerTest(
        {
          stage: AuthStage.signingEmailAndPassword,
          email: testEmail,
          providers: [AuthProvider.github, AuthProvider.password],
          inProgress: false,
          selectedProvider: AuthProvider.password,
        },
        AuthUIActions.signEmailPassword({ password: testPassword }),
        {
          inProgress: true,
        },
      );
    });

    it(AuthUIActions.restorePassword.type, () => {
      reducerTest(
        {
          stage: AuthStage.signingEmailAndPassword,
          email: testEmail,
          providers: [AuthProvider.github, AuthProvider.password],
          inProgress: false,
          selectedProvider: AuthProvider.password,
        },
        AuthUIActions.restorePassword(),
        {
          stage: AuthStage.restoringPassword,
          inProgress: true,
        },
      );
    });

    it(AuthUIActions.signOut.type, () => {
      reducerTest(
        {
          stage: AuthStage.loadingProfile,
          email: testEmail,
          userId: testUserId,
          displayName: testDisplayName,
          photoURL: testPhotoURL,
          providers: [AuthProvider.github, AuthProvider.password],
          inProgress: false,
          selectedProvider: AuthProvider.password,
        },
        AuthUIActions.signOut(),
        {
          stage: AuthStage.signingOut,
          inProgress: true,
        },
      );
    });
  });

  describe('API Actions', () => {
    it(AuthAPIActions.init.type, () => {
      reducerTest({}, AuthAPIActions.init(), {
        inProgress: true,
        stage: AuthStage.initialization,
      });
    });

    it(AuthAPIActions.initSignedIn.type, () => {
      reducerTest(
        { stage: AuthStage.initialization, inProgress: true },
        AuthAPIActions.initSignedIn(mockExpectedActionPayload),
        {
          inProgress: false,
          stage: AuthStage.loadingProfile,
          ...mockExpectedActionPayload,
        },
      );
    });

    it(AuthAPIActions.initNotAuthenticated.type, () => {
      reducerTest({ stage: AuthStage.initialization, inProgress: true }, AuthAPIActions.initNotAuthenticated(), {
        inProgress: false,
        stage: AuthStage.enteringEmail,
      });
    });

    it(AuthAPIActions.initNotAuthenticatedButRehydrateState.type, () => {
      reducerTest(
        { stage: AuthStage.initialization, inProgress: true },
        AuthAPIActions.initNotAuthenticatedButRehydrateState({
          email: testEmail,
          displayName: testDisplayName,
          photoURL: testPhotoURL,
        }),
        {
          inProgress: false,
          stage: AuthStage.enteringEmail,
          email: testEmail,
          displayName: testDisplayName,
          photoURL: testPhotoURL,
        },
      );
    });

    it(AuthAPIActions.saveOriginalURL.type, () => {
      const url = '/my-url';
      reducerTest({}, AuthAPIActions.saveOriginalURL({ url }), {
        originalURL: url,
      });
    });

    it(AuthAPIActions.fetchProviders.type, () => {
      reducerTest({ stage: AuthStage.enteringEmail, email: testEmail }, AuthAPIActions.fetchProviders(), {
        inProgress: true,
        stage: AuthStage.fetchingProviders,
      });
    });

    it(`"${AuthAPIActions.fetchProvidersSuccess.type}": saves multiple providers (user exists in Auth DB)"`, () => {
      const providers = [AuthProvider.password, AuthProvider.google];
      reducerTest(
        {
          email: testEmail,
          stage: AuthStage.fetchingProviders,
          providers: undefined,
          inProgress: true,
        },
        AuthAPIActions.fetchProvidersSuccess({ providers }),
        {
          inProgress: false,
          stage: AuthStage.choosingProvider,
          providers,
        },
      );
    });

    it(`"${AuthAPIActions.fetchProvidersSuccess.type}": saves zero providers (user doesn't exist in Auth DB)`, () => {
      const providers = [AuthProvider.password, AuthProvider.google];
      reducerTest(
        {
          email: testEmail,
          stage: AuthStage.fetchingProviders,
          providers: [],
          inProgress: true,
        },
        AuthAPIActions.fetchProvidersSuccess({ providers }),
        {
          inProgress: false,
          stage: AuthStage.choosingProvider,
          providers,
        },
      );
    });

    it(AuthAPIActions.signedUp.type, () => {
      reducerTest(
        {
          stage: AuthStage.signingEmailAndPassword,
          email: testEmail.repeat(2),
          providers: [AuthProvider.google],
          inProgress: true,
          selectedProvider: AuthProvider.google,
        },
        AuthAPIActions.signedUp({ ...mockExpectedActionPayload, isNewUser: true }),
        {
          inProgress: false,
          stage: AuthStage.creatingProfile,
          ...mockExpectedActionPayload,
          isNewUser: true,
          successMessage: `You've successfully signed up! Feel free to explore the app 🎉`,
        },
      );
    });

    it(AuthAPIActions.signEmailLinkRequestSent.type, () => {
      reducerTest(
        {
          stage: AuthStage.signingEmailLink,
          email: testEmail,
          providers: [AuthProvider.link],
          inProgress: true,
          selectedProvider: AuthProvider.link,
        },
        AuthAPIActions.signEmailLinkRequestSent(),
        {
          inProgress: false,
          successMessage: 'Magic link has been sent to your email. Follow it to proceed.',
        },
      );
    });

    it(AuthAPIActions.signEmailLinkFinish.type, () => {
      reducerTest(
        {
          stage: AuthStage.initialization,
          inProgress: true,
        },
        AuthAPIActions.signEmailLinkFinish(),
        {
          inProgress: true,
          stage: AuthStage.signingEmailLink,
          selectedProvider: AuthProvider.link,
        },
      );
    });

    it(AuthAPIActions.restorePasswordSuccess.type, () => {
      reducerTest(
        {
          stage: AuthStage.restoringPassword,
          email: testEmail,
          providers: [AuthProvider.password],
          selectedProvider: AuthProvider.password,
          inProgress: true,
        },
        AuthAPIActions.restorePasswordSuccess(),
        {
          inProgress: false,
          successMessage: 'Check your email for password reset instructions.',
        },
      );
    });

    it(AuthAPIActions.signedIn.type, () => {
      reducerTest(
        {
          stage: AuthStage.signingGoogle,
          email: testEmail.repeat(2),
          providers: [AuthProvider.google],
          selectedProvider: AuthProvider.google,
          inProgress: true,
        },
        AuthAPIActions.signedIn(mockExpectedActionPayload),
        {
          inProgress: false,
          stage: AuthStage.loadingProfile,
          ...mockExpectedActionPayload,
        },
      );
    });

    it(AuthAPIActions.actionFailed.type, () => {
      const error = { message: 'Wrong password', code: 'auth/wrong-pass' };
      reducerTest(
        {
          stage: AuthStage.signingEmailAndPassword,
          selectedProvider: AuthProvider.password,
          email: testEmail,
          inProgress: true,
        },
        AuthAPIActions.actionFailed(error),
        {
          inProgress: false,
          error,
        },
      );
    });

    it(AuthAPIActions.signedOut.type, () => {
      reducerTest(
        {
          stage: AuthStage.signingOut,
          inProgress: true,
          email: testEmail,
          providers: [AuthProvider.google],
          selectedProvider: AuthProvider.google,
          userId: testUserId,
          displayName: testDisplayName,
          photoURL: testPhotoURL,
          isNewUser: true,
          isEmailVerified: true,
          createdAt: 123567890,
        },
        AuthAPIActions.signedOut(),
        {
          stage: AuthStage.enteringEmail,
          inProgress: false,
          email: undefined,
          providers: undefined,
          selectedProvider: undefined,
          userId: undefined,
          displayName: undefined,
          photoURL: undefined,
          isNewUser: undefined,
          isEmailVerified: undefined,
          createdAt: undefined,
        },
      );
    });

    it(AuthAPIActions.profileLoadSuccessNoProfileYet.type, () => {
      reducerTest(
        {
          stage: AuthStage.loadingProfile,
          inProgress: true,
          email: testEmail,
          providers: [AuthProvider.google],
          selectedProvider: AuthProvider.google,
          userId: testUserId,
          displayName: testDisplayName,
          photoURL: testPhotoURL,
          isNewUser: false,
          isEmailVerified: true,
          createdAt: 123567890,
        },
        AuthAPIActions.profileLoadSuccessNoProfileYet(),
        {
          stage: AuthStage.creatingProfile,
          inProgress: false,
        },
      );
    });

    it(AuthAPIActions.profileLoadSuccess.type, () => {
      reducerTest(
        {
          stage: AuthStage.loadingProfile,
          inProgress: true,
          email: testEmail,
          providers: [AuthProvider.google],
          selectedProvider: AuthProvider.google,
          userId: testUserId,
          displayName: testDisplayName,
          photoURL: testPhotoURL,
          isNewUser: false,
          isEmailVerified: true,
          createdAt: 123567890,
        },
        AuthAPIActions.profileLoadSuccess({ user: mockUsers[0] }),
        {
          stage: AuthStage.authorizing,
          inProgress: true,
          user: mockUsers[0],
        },
      );
    });

    it(AuthAPIActions.profileCreateSuccess.type, () => {
      reducerTest(
        {
          stage: AuthStage.creatingProfile,
          inProgress: true,
          email: testEmail,
          providers: [AuthProvider.google],
          selectedProvider: AuthProvider.google,
          userId: testUserId,
          displayName: testDisplayName,
          photoURL: testPhotoURL,
          isNewUser: false,
          isEmailVerified: true,
          createdAt: 123567890,
        },
        AuthAPIActions.profileCreateSuccess({ user: mockUsers[0] }),
        {
          stage: AuthStage.authorizing,
          inProgress: true,
          user: mockUsers[0],
        },
      );
    });

    it(AuthAPIActions.authorized.type, () => {
      reducerTest(
        {
          stage: AuthStage.authorizing,
          inProgress: true,
          email: testEmail,
          providers: [AuthProvider.google],
          selectedProvider: AuthProvider.google,
          userId: testUserId,
          displayName: testDisplayName,
          photoURL: testPhotoURL,
          isNewUser: false,
          isEmailVerified: true,
          createdAt: 123567890,
          user: mockUsers[0],
        },
        AuthAPIActions.authorized(),
        {
          stage: AuthStage.authorized,
          inProgress: false,
        },
      );
    });

    it(AuthAPIActions.notAuthorized.type, () => {
      const reason = 'You are banned';
      reducerTest(
        {
          stage: AuthStage.authorizing,
          inProgress: true,
          email: testEmail,
          providers: [AuthProvider.google],
          selectedProvider: AuthProvider.google,
          userId: testUserId,
          displayName: testDisplayName,
          photoURL: testPhotoURL,
          isNewUser: false,
          isEmailVerified: true,
          createdAt: 123567890,
          user: mockUsers[0],
        },
        AuthAPIActions.notAuthorized({ reason }),
        {
          stage: AuthStage.notAuthorized,
          inProgress: false,
          error: { message: reason },
        },
      );
    });

    it(AuthAPIActions.setJWT.type, () => {
      reducerTest(
        {
          stage: AuthStage.signingAnonymously,
          inProgress: true,
        },
        AuthAPIActions.setJWT({ jwt: 'jwt' }),
        {
          jwt: 'jwt',
        },
        false,
      );
      reducerTest(
        {
          stage: AuthStage.signingOut,
          inProgress: true,
          jwt: 'jwt',
        },
        AuthAPIActions.setJWT({}),
        {
          jwt: undefined,
        },
        false,
      );
    });
  });
});
